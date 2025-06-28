#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import json
import re
import os
from dotenv import load_dotenv
from anthropic import Anthropic
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import asyncio
from typing import Optional
from datetime import datetime
import logging

# Carrega as variáveis de ambiente do arquivo .env
script_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(script_dir, '..', '..', '.env')
load_dotenv(dotenv_path=dotenv_path)

# Configurar logging estruturado
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# --- Definição do Modelo de Requisição ---
class DocumentoRequest(BaseModel):
    teor_documento: str
    tipo_documento: Optional[str] = None

# --- Definição do Modelo de Resposta ---
class ProcessamentoResponse(BaseModel):
    teor: str
    resumo: Optional[str] = None
    entidades: Optional[dict] = None
    prazos: Optional[list] = None
    tipo_documento: Optional[str] = None
    parecer: Optional[str] = None
    acoes_recomendadas: Optional[list] = None
    minuta_resposta: Optional[str] = None
    urgencia: Optional[str] = None
    complexidade: Optional[str] = None

class ProcessadorDocumentosJuridicos:
    def __init__(self):
        self.anthropic_client = None
        self.model_name = "claude-3-5-sonnet-20241022"  # Modelo atualizado
        self.init_anthropic_client()
    
    def init_anthropic_client(self):
        """Inicializa o cliente da API da Anthropic."""
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("A variável de ambiente ANTHROPIC_API_KEY não está configurada.")
        
        try:
            # Cliente síncrono da Anthropic
            self.anthropic_client = Anthropic(api_key=api_key)
            logger.info(f"Cliente Anthropic inicializado com sucesso para o modelo: {self.model_name}")
        except Exception as e:
            logger.error(f"Erro ao inicializar cliente Anthropic: {e}")
            self.anthropic_client = None
    
    def limpar_texto(self, texto):
        """Limpa e normaliza o texto."""
        if not texto:
            return ""
        # Substitui múltiplos espaços, quebras de linha e tabs por um único espaço
        texto = re.sub(r'\s+', ' ', texto)
        # Remove caracteres não alfanuméricos, exceto pontuação básica
        texto = re.sub(r'[^\w\s\.\,\;\:\!\?\-\(\)\[\]\{\}\<\>\/\\|@#$%&*+=_`~^çÇáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙãõÃÕâêîôûÂÊÎÔÛ]', '', texto)
        texto = texto.strip()
        return texto
    
    def _call_claude_api(self, system_prompt: str, user_message: str, max_tokens: int = 1024, temperature: float = 0.0):
        """Método auxiliar para chamar a API do Claude de forma síncrona."""
        if not self.anthropic_client:
            raise Exception("Cliente Anthropic não inicializado.")
        
        try:
            logger.info(f"Chamando API Claude - Modelo: {self.model_name}, Tokens: {max_tokens}")
            
            # Chamada síncrona (sem await)
            response = self.anthropic_client.messages.create(
                model=self.model_name,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_message}
                ]
            )

            logger.info(f"API Claude respondeu com sucesso - Tokens usados: {response.usage.input_tokens + response.usage.output_tokens}")
            return response.content[0].text

        except Exception as e:
            logger.error(f"Erro na API Claude: {str(e)}")
            logger.error(f"Modelo tentado: {self.model_name}")  # Corrigido de current_model
            logger.error(f"Prompt system (primeiros 100 chars): {system_prompt[:100]}")
            raise

    async def gerar_resumo(self, texto, max_length=500):
        """Gera um resumo do texto usando Claude."""
        if not texto or len(texto.strip()) < 50:
            return "Texto muito curto para gerar resumo."
        
        system_prompt = "Você é um assistente jurídico especializado em resumir documentos. Seu resumo deve ser conciso, objetivo e focar nos pontos mais relevantes do texto, especialmente para fins jurídicos."
        user_message = f"Por favor, resuma o seguinte texto jurídico:\n\n{texto[:20000]}"
        
        try:
            # Executar em thread pool para não bloquear o event loop
            loop = asyncio.get_event_loop()
            resumo = await loop.run_in_executor(
                None, 
                self._call_claude_api, 
                system_prompt, 
                user_message, 
                max_length
            )
            return resumo
        except Exception as e:
            logger.error(f"Erro ao gerar resumo com IA: {e}")
            return "Erro ao gerar resumo com IA. Tente novamente mais tarde."

    async def extrair_entidades_juridicas(self, texto):
        """Extrai entidades jurídicas específicas do texto usando Claude."""
        system_prompt = """Você é um extrator de entidades jurídicas. Extraia as seguintes entidades do texto fornecido e retorne-as em formato JSON.
        As entidades são:
        - "numeros_processo": Lista de números de processo (formato 0000000-00.0000.0.00.0000)
        - "partes": Lista de nomes de pessoas ou empresas envolvidas
        - "advogados": Lista de nomes de advogados
        - "tribunais": Lista de nomes de tribunais ou órgãos judiciais
        - "datas": Lista de datas relevantes (formato YYYY-MM-DD, se possível)
        - "valores": Lista de valores monetários (ex: R$ 1.000,00)
        
        Se uma entidade não for encontrada, sua lista deve ser vazia.
        """
        user_message = f"Extraia as entidades do seguinte texto jurídico:\n\n{texto[:20000]}"
        
        try:
            loop = asyncio.get_event_loop()
            json_str = await loop.run_in_executor(
                None, 
                self._call_claude_api, 
                system_prompt, 
                user_message, 
                1024, 
                0.0
            )
            
            # Tentar limpar e parsear o JSON
            json_str = json_str.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            
            return json.loads(json_str)
        except Exception as e:
            logger.error(f"Erro ao extrair entidades ou parsear JSON: {e}")
            return {
                'numeros_processo': [], 'partes': [], 'advogados': [],
                'tribunais': [], 'datas': [], 'valores': []
            }

    async def classificar_tipo_documento(self, texto):
        """Classifica o tipo de documento jurídico usando Claude."""
        system_prompt = """Classifique o seguinte documento jurídico em uma das categorias fornecidas. Retorne APENAS a categoria.
        Categorias: petição inicial, despacho, intimação, parecer mp, contestação, decisão, sentença, mandado, documento genérico.
        """
        user_message = f"Classifique o seguinte texto:\n\n{texto[:10000]}"
        
        try:
            loop = asyncio.get_event_loop()
            tipo = await loop.run_in_executor(
                None, 
                self._call_claude_api, 
                system_prompt, 
                user_message, 
                50, 
                0.0
            )
            return tipo.strip().lower()
        except Exception as e:
            logger.error(f"Erro ao classificar tipo de documento: {e}")
            return 'documento genérico'

    async def gerar_parecer_acoes(self, texto_intimacao, contexto_processo=None):
        """Gera parecer com ações recomendadas usando Claude."""
        system_prompt = """Você é um assistente jurídico. Com base na intimação fornecida, gere um parecer conciso e liste as ações recomendadas para o advogado.
        Formato de saída esperado:
        PARECER: [Seu parecer aqui]
        AÇÕES RECOMENDADAS:
        - [Ação 1]
        - [Ação 2]
        - [Ação N]
        """
        user_message = f"Analise a seguinte intimação jurídica:\n\n{texto_intimacao[:20000]}"
        
        try:
            loop = asyncio.get_event_loop()
            response_text = await loop.run_in_executor(
                None, 
                self._call_claude_api, 
                system_prompt, 
                user_message, 
                1024
            )
            
            parecer_match = re.search(r"PARECER:\s*(.*)", response_text, re.DOTALL)
            acoes_match = re.search(r"AÇÕES RECOMENDADAS:\s*(.*)", response_text, re.DOTALL)
            
            parecer = parecer_match.group(1).strip() if parecer_match else "Não foi possível gerar um parecer."
            acoes_recomendadas = []
            if acoes_match:
                acoes_list_str = acoes_match.group(1).strip()
                acoes_recomendadas = [line.strip().replace("- ", "") for line in acoes_list_str.split('\n') if line.strip()]
            
            return {
                'parecer': parecer,
                'acoes_recomendadas': acoes_recomendadas
            }
        except Exception as e:
            logger.error(f"Erro ao gerar parecer/ações: {e}")
            return {
                'parecer': 'Erro ao gerar parecer automático.',
                'acoes_recomendadas': ['Revisar intimação manualmente']
            }

    async def gerar_minuta_resposta(self, tipo_documento, texto_intimacao, dados_processo=None):
        """Gera minuta de resposta/petição usando Claude."""
        system_prompt = f"""Você é um assistente jurídico especializado em redação de minutas.
        Com base no tipo de documento '{tipo_documento}' e no texto da intimação/documento fornecido, elabore uma minuta de resposta ou petição apropriada.
        Inclua placeholders para informações específicas como [NOME DO ADVOGADO], [OAB], [LOCAL], [DATA], [DESCREVER FATOS RELEVANTES], [FUNDAMENTAÇÃO JURÍDICA], [PEDIDO PRINCIPAL], etc.
        """
        user_message = f"Gere uma minuta para um documento do tipo '{tipo_documento}' com base no seguinte texto:\n\n{texto_intimacao[:20000]}"
        
        try:
            loop = asyncio.get_event_loop()
            minuta = await loop.run_in_executor(
                None, 
                self._call_claude_api, 
                system_prompt, 
                user_message, 
                2048
            )
            return minuta
        except Exception as e:
            logger.error(f"Erro ao gerar minuta automática: {e}")
            return "Erro ao gerar minuta automática."

    def extrair_prazos(self, texto):
        """Extrai prazos mencionados no texto."""
        prazos = []
        padroes_prazo = [
            r'prazo de (\d+) dias?', r'no prazo de (\d+) dias?', r'em (\d+) dias?',
            r'(\d+) dias? para', r'(\d+) dias? úteis', r'(\d+) dias? corridos'
        ]
        for padrao in padroes_prazo:
            matches = re.finditer(padrao, texto.lower())
            for match in matches:
                dias = int(match.group(1))
                contexto = texto[max(0, match.start()-50):match.end()+50]
                prazos.append({
                    'dias': dias,
                    'contexto': contexto.strip(),
                    'posicao': match.start()
                })
        return prazos

    async def analisar_semantica(self, texto):
        """Realiza análise semântica usando Claude."""
        system_prompt = """Analise o seguinte texto jurídico e determine:
        1. Sentimento geral (positivo, negativo, neutro) em relação ao cliente ou ao caso.
        2. Complexidade (baixa, média, alta) do texto.
        3. Urgência (baixa, normal, alta) das ações a serem tomadas com base no texto.
        
        Retorne o resultado em formato JSON:
        {
            "sentimento": "...",
            "complexidade": "...",
            "urgencia": "..."
        }
        """
        user_message = f"Analise o texto:\n\n{texto[:10000]}"
        
        try:
            loop = asyncio.get_event_loop()
            json_str = await loop.run_in_executor(
                None, 
                self._call_claude_api, 
                system_prompt, 
                user_message, 
                200, 
                0.0
            )
            
            json_str = json_str.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            return json.loads(json_str)
        except Exception as e:
            logger.error(f"Erro na análise semântica ou parsear JSON: {e}")
            return {
                "sentimento": "neutro",
                "complexidade": "média",
                "urgencia": "normal"
            }

    async def processar_documento_completo(self, teor_documento: str, tipo_documento: str = None):
        """Orquestra o processamento completo de um documento."""
        if not teor_documento:
            raise Exception("Teor do documento não fornecido.")
        
        # Limpar o texto antes de enviar para a API
        teor_limpo = self.limpar_texto(teor_documento)

        # Se o tipo de documento não for fornecido, tentar classificá-lo
        if not tipo_documento:
            tipo_documento = await self.classificar_tipo_documento(teor_limpo)

        resumo = await self.gerar_resumo(teor_limpo)
        entidades = await self.extrair_entidades_juridicas(teor_limpo)
        prazos = self.extrair_prazos(teor_limpo)
        
        parecer_acoes = await self.gerar_parecer_acoes(teor_limpo)
        parecer = parecer_acoes['parecer']
        acoes_recomendadas = parecer_acoes['acoes_recomendadas']

        minuta = await self.gerar_minuta_resposta(tipo_documento, teor_limpo)
        
        analise_semantica = await self.analisar_semantica(teor_limpo)
        urgencia = analise_semantica.get('urgencia', 'normal')
        complexidade = analise_semantica.get('complexidade', 'média')

        return {
            "teor": teor_documento,
            "resumo": resumo,
            "entidades": entidades,
            "prazos": prazos,
            "tipo_documento": tipo_documento,
            "parecer": parecer,
            "acoes_recomendadas": acoes_recomendadas,
            "minuta_resposta": minuta,
            "urgencia": urgencia,
            "complexidade": complexidade
        }

# --- Configuração FastAPI ---
app = FastAPI()
processador = ProcessadorDocumentosJuridicos()

@app.post("/processar-documento", response_model=ProcessamentoResponse)
async def processar_documento_endpoint(request: DocumentoRequest):
    logger.info(f"Recebido teor_documento: {request.teor_documento[:100]}...")
    logger.info(f"Tipo de teor_documento recebido: {type(request.teor_documento)}")
    logger.info(f"Tamanho de teor_documento recebido: {len(request.teor_documento) if request.teor_documento else 'null/empty'}")
    
    try:
        resultado = await processador.processar_documento_completo(
            request.teor_documento,
            request.tipo_documento
        )
        
        # Validar que o resultado é serializável
        try:
            json.dumps(resultado, ensure_ascii=False)
        except (TypeError, ValueError) as e:
            logger.error(f"Erro na serialização do resultado: {e}")
            raise HTTPException(status_code=500, detail="Erro na serialização da resposta")
        
        return ProcessamentoResponse(**resultado)
    except Exception as e:
        logger.error(f"Erro na API /processar-documento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Endpoint para verificar saúde do serviço."""
    logger.info("Recebida requisição para /health.")
    try:
        # Testar conexão com Claude de forma síncrona
        loop = asyncio.get_event_loop()
        test_response = await loop.run_in_executor(
            None,
            processador._call_claude_api,
            "Responda apenas 'OK'", 
            "teste", 
            10
        )
        
        status_info = {
            "status": "healthy",
            "claude_api": "connected",
            "model": processador.model_name,
            "timestamp": datetime.now().isoformat()
        }
        logger.info(f"Health check bem-sucedido: {status_info}")
        return status_info
    except Exception as e:
        status_info = {
            "status": "unhealthy",
            "claude_api": "disconnected",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
        logger.error(f"Health check falhou: {status_info}", exc_info=True)
        return status_info

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)


