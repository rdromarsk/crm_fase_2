const axios = require('axios');
const path = require('path'); // Mantido caso haja necessidade futura de manipulação de caminhos

class ProcessadorNLP {
    constructor() {
        // A URL base do serviço FastAPI Python
        // Prioriza a variável de ambiente PYTHON_NLP_URL, caso contrário, usa o padrão local
        this.baseURL = process.env.PYTHON_NLP_URL || 'http://127.0.0.1:8001';
    }

    /**
     * Método auxiliar para fazer requisições POST ao serviço Python NLP.
     * @param {string} endpoint O caminho do endpoint da API Python (ex: '/processar-documento' ).
     * @param {object} payload O corpo da requisição a ser enviado para a API Python.
     * @returns {Promise<object>} Os dados da resposta da API Python.
     * @throws {Error} Se houver um erro na comunicação ou no processamento da API Python.
     */
    async _callPythonNLPService(endpoint, payload) {
        try {
            const response = await axios.post(`${this.baseURL}${endpoint}`, payload, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error(`Erro na comunicação com o serviço Python NLP (${endpoint}):`, error.message);
            if (error.response) {
                // Erro retornado pelo servidor Python (ex: HTTPException do FastAPI)
                console.error('Dados do erro da API Python:', error.response.data);
                throw new Error(`Falha no processamento NLP: ${error.response.data.detail || error.response.statusText}`);
            } else if (error.request) {
                // A requisição foi feita, mas nenhuma resposta foi recebida (ex: servidor offline)
                console.error('Nenhuma resposta recebida do serviço Python:', error.request);
                throw new Error('Falha no processamento NLP: Serviço Python indisponível ou sem resposta.');
            } else {
                // Algo aconteceu na configuração da requisição que disparou um erro
                console.error('Erro ao configurar a requisição para o serviço Python:', error.message);
                throw new Error(`Falha no processamento NLP: ${error.message}`);
            }
        }
    }

    /**
     * Processa um documento completo usando o serviço Python NLP.
     * @param {string} teorDocumento O conteúdo textual completo do documento a ser processado.
     * @param {string} [tipoDocumento=null] O tipo de documento (opcional, o Python pode classificar).
     * @returns {Promise<object>} Um objeto contendo todos os resultados do processamento NLP.
     */
    async processarIntimacaoCompleta(teorDocumento, tipoDocumento = null) {
        console.log(`Chamando serviço Python para processar intimação completa (teor): ${teorDocumento.substring(0, 100)}...`); // Log do início do teor
        console.log("Tipo de teorDocumento (Node.js):", typeof teorDocumento);
        console.log("Tamanho do teorDocumento (Node.js):", teorDocumento ? teorDocumento.length : 'null/undefined');
        const payload = {
            teor_documento: teorDocumento, // MUDANÇA AQUI: Passando o teor
            tipo_documento: tipoDocumento
        };
        // Cuidado: JSON.stringify pode falhar se teorDocumento for um objeto circular ou muito grande.
        // Para depuração, podemos tentar logar uma parte.
        try {
            console.log("Payload enviado para Python (Node.js):", JSON.stringify(payload).substring(0, 200) + "..."); // <-- Adicione este log
        } catch (e) {
            console.error("Erro ao serializar payload para log:", e);
        }

        const resultadoCompleto = await this._callPythonNLPService('/processar-documento', payload);
        return resultadoCompleto;
    }

    // Os métodos abaixo são wrappers para o método processarIntimacaoCompleta.
    // Eles chamam o endpoint completo e extraem a parte relevante da resposta.
    // Isso mantém a compatibilidade com chamadas existentes no código Node.js
    // que esperavam resultados granulares.

    async extrairTextoPDF(teorDocumento) {
        const resultado = await this.processarIntimacaoCompleta(teorDocumento);
        return resultado.teor || null;
    }

    async gerarResumo(teorDocumento) {
        const resultado = await this.processarIntimacaoCompleta(teorDocumento);
        return resultado.resumo || 'Erro ao gerar resumo';
    }

    async gerarParecer(teorDocumento) {
        const resultado = await this.processarIntimacaoCompleta(teorDocumento);
        return {
            tipo_intimacao: resultado.tipo_documento,
            prazos_identificados: resultado.prazos,
            entidades: resultado.entidades, // Assumindo que entidades é um objeto/dicionário
            parecer: resultado.parecer,
            acoes_recomendadas: resultado.acoes_recomendadas
        };
    }

    async gerarMinuta(teorDocumento) {
        const resultado = await this.processarIntimacaoCompleta(teorDocumento);
        return {
            tipo: resultado.tipo_documento,
            minuta: resultado.minuta_resposta
        };
    }

    async analisarSemantica(teorDocumento) {
        const resultado = await this.processarIntimacaoCompleta(teorDocumento);
        return {
            sentimento: resultado.sentimento,
            complexidade: resultado.complexidade,
            // O Claude não retorna tópicos diretamente no nosso prompt atual,
            // então esta lista pode ser vazia ou preenchida com lógica adicional se necessário.
            topicos: [], 
            urgencia: resultado.urgencia
        };
    }

    // Este método (reconhecerProcessosSimilares) não está diretamente mapeado
    // para o endpoint /processar-documento do FastAPI.
    // Se essa funcionalidade ainda for necessária, o FastAPI precisaria de um
    // endpoint dedicado para ela, ou a lógica de similaridade teria que ser
    // re-implementada no Node.js (o que não é o ideal para a centralização).
    // Por enquanto, ele retorna um array vazio e um aviso.
    async reconhecerProcessosSimilares(textoIntimacao, intimacoesExistentes) {
        console.warn("reconhecerProcessosSimilares: Esta funcionalidade deve ser implementada no serviço Python NLP com um endpoint dedicado, se for necessária.");
        // Se o FastAPI tiver um endpoint para isso, a chamada seria similar a _callPythonNLPService
        // Ex: return await this._callPythonNLPService('/reconhecer-similares', { texto: textoIntimacao, existentes: intimacoesExistentes });
        return [];
    }
}

module.exports = ProcessadorNLP;

