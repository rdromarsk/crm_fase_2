// routes/juridico.js
const express = require('express');
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const { 
    intimacaoSchema, 
    processoSchema, 
    documentoSchema,
    buscaSchema,
    validationMiddleware, 
    queryValidationMiddleware,
    sanitizeInput 
} = require('../middleware/validation');
const Joi = require('joi');

// Variáveis para armazenar as instâncias dos serviços
let juridicoServiceInstance;
let processadorNLPInstance;

// Função para definir as instâncias dos serviços (chamada pelo server.js)
router.setServices = (js, nlp) => {
    juridicoServiceInstance = js;
    processadorNLPInstance = nlp;
};

// Middleware de sanitização para todas as rotas
router.use(sanitizeInput);

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// Schema específico para filtros de busca de intimações
const intimacoesFiltrosSchema = Joi.object({
    // Campos de texto aceitam strings vazias
    numeroProcesso: Joi.string()
        .pattern(/^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/)
        .allow('')
        .optional(),

    parte: Joi.string().max(255).allow('').optional(),
    advogado: Joi.string().max(255).allow('').optional(),
    status: Joi.string()
        .valid('pendente', 'em_andamento', 'cumprida', 'delegada', 'vencida', '')
        .optional(),

    // Campos de data com tratamento especial
    dataInicio: Joi.alternatives().try(
        Joi.date().iso(),
        Joi.string().allow('')
    ).optional(),

    dataFim: Joi.alternatives().try(
        Joi.date().iso(),
        Joi.string().allow('')
    ).optional(),

    // Campos numéricos com conversão automática e valores padrão
    page: Joi.alternatives().try(
        Joi.number().integer().min(1),
        Joi.string().pattern(/^\d+$/).custom((value) => parseInt(value)),
        Joi.string().allow('')
    ).default(1),

    limit: Joi.alternatives().try(
        Joi.number().integer().min(1).max(100),
        Joi.string().pattern(/^\d+$/).custom((value) => Math.min(parseInt(value), 100)),
        Joi.string().allow('')
    ).default(50)
});

// Schema para atualização de status
const statusUpdateSchema = Joi.object({
    status: Joi.string().valid('pendente', 'em_andamento', 'cumprida', 'delegada', 'vencida').required().messages({
        'any.only': 'Status deve ser: pendente, em_andamento, cumprida, delegada ou vencida',
        'any.required': 'Status é obrigatório'
    })
});

// Schema para notas
const notasSchema = Joi.object({
    notas: Joi.string().max(5000).required().messages({
        'string.max': 'Notas devem ter no máximo 5000 caracteres',
        'any.required': 'Notas são obrigatórias'
    })
});

// Schema para configuração de credenciais
const credenciaisSchema = Joi.object({
    numeroOAB: Joi.string().pattern(/^\d{4,6}$/).required().messages({
        'string.pattern.base': 'Número da OAB deve conter apenas números (4-6 dígitos)',
        'any.required': 'Número da OAB é obrigatório'
    }),
    usuarioPJE: Joi.string().min(3).max(50).required().messages({
        'string.min': 'Usuário PJE deve ter pelo menos 3 caracteres',
        'string.max': 'Usuário PJE deve ter no máximo 50 caracteres',
        'any.required': 'Usuário PJE é obrigatório'
    }),
    senhaPJE: Joi.string().min(6).max(100).required().messages({
        'string.min': 'Senha PJE deve ter pelo menos 6 caracteres',
        'string.max': 'Senha PJE deve ter no máximo 100 caracteres',
        'any.required': 'Senha PJE é obrigatória'
    }),
    tribunal: Joi.string().valid('TJCE', 'TJSP', 'TJRJ', 'TJMG', 'TJRS', 'TJPR', 'TJSC', 'TJGO', 'TJBA', 'TJPE').default('TJCE').messages({
        'any.only': 'Tribunal deve ser um dos tribunais suportados'
    })
});

// Schema para atualização manual de intimações
const atualizacaoManualSchema = Joi.object({
    dataInicio: Joi.date().iso().optional().messages({
        'date.format': 'Data de início deve estar no formato ISO (YYYY-MM-DD)'
    }),
    dataFim: Joi.date().iso().optional().messages({
        'date.format': 'Data de fim deve estar no formato ISO (YYYY-MM-DD)'
    })
});

// GET /api/juridico/intimacoes - Listar intimações com filtros
router.get('/intimacoes', queryValidationMiddleware(intimacoesFiltrosSchema), async (req, res) => {
    try {
        console.log('🎯 [ROUTE] Rota de intimações executando...');
        console.log('   req.query recebido:', req.query);

        // CAMADA 2: Destructuring com fallbacks de segurança
        const {
            numeroProcesso,
            parte,
            advogado,
            status,
            dataInicio,
            dataFim,
            page = 1,
            limit = 50
        } = req.query;

        const filtros = {
            numeroProcesso,
            parte,
            advogado,
            status,
            dataInicio,
            dataFim,
            advogadoId: req.user.id // Filtrar por advogado logado
        };

        // CAMADA 3: Validação adicional de segurança
        const safePage = (typeof page === 'number' && !isNaN(page) && page > 0) ? page : 1;
        const safeLimit = (typeof limit === 'number' && !isNaN(limit) && limit > 0 && limit <= 100) ? limit : 50;
        
        // Usar valores seguros para a consulta
        const intimacoes = await juridicoServiceInstance.buscarIntimacoes(filtros, safePage, safeLimit);
        
        res.json(intimacoes);
    } catch (error) {
        console.error('❌ [ERROR] Erro ao buscar intimações:', error);
        res.status(500).json({ 
            erro: 'Erro interno do servidor',
            detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/juridico/intimacoes/:id/detalhes - Detalhes completos de uma intimação
router.get('/intimacoes/:id/detalhes', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validar ID
        const idValidation = Joi.number().integer().positive().validate(id);
        if (idValidation.error) {
            return res.status(400).json({ 
                erro: 'ID inválido',
                detalhes: 'ID deve ser um número inteiro positivo'
            });
        }

        const intimacao = await juridicoServiceInstance.buscarIntimacaoPorId(id);

        console.log("Intimação encontrada:", intimacao);
        console.log("req.user:", req.user);
        console.log("Comparando:", intimacao?.advogado_id, "com", req.user?.id);

        if (!intimacao) {
            return res.status(404).json({ erro: 'Intimação não encontrada' });
        }

        // Verificar se o usuário tem acesso a esta intimação
        if (intimacao.advogado_id !== req.user.id) {
            return res.status(403).json({ erro: 'Acesso negado' });
        }

        res.json(intimacao);
    } catch (error) {
        console.error('Erro ao buscar detalhes da intimação:', error);
        res.status(500).json({ 
            erro: 'Erro interno do servidor',
            detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT /api/juridico/intimacoes/:id/status - Atualizar status da intimação
router.put('/intimacoes/:id/status', validationMiddleware(statusUpdateSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validar ID
        const idValidation = Joi.number().integer().positive().validate(id);
        if (idValidation.error) {
            return res.status(400).json({ 
                erro: 'ID inválido',
                detalhes: 'ID deve ser um número inteiro positivo'
            });
        }

        const intimacao = await juridicoServiceInstance.buscarIntimacaoPorId(id);

        if (!intimacao) {
            return res.status(404).json({ erro: 'Intimação não encontrada' });
        }

        if (intimacao.advogado_id !== req.user.id) {
            return res.status(403).json({ erro: 'Acesso negado' });
        }

        await juridicoServiceInstance.atualizarStatusIntimacao(id, status);

        res.json({ sucesso: true, mensagem: 'Status atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ 
            erro: 'Erro interno do servidor',
            detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/juridico/atualizar-intimacoes - Atualização manual de intimações
router.post('/atualizar-intimacoes', validationMiddleware(atualizacaoManualSchema), async (req, res) => {
    console.log("Requisição recebida para /atualizar-intimacoes");
    try {
        // Extrair dataInicio e dataFim do corpo da requisição (já validados)
        const { dataInicio, dataFim } = req.body;
        console.log("Parâmetros de data:", { dataInicio, dataFim });

        // Chamar o serviço passando as datas
        const resultado = await juridicoServiceInstance.coletarIntimacoesManual(req.user.id, dataInicio, dataFim);

        res.json(resultado);
    } catch (error) {
        console.error("Erro na atualização manual:", error.message, error.stack);
        res.status(500).json({
            sucesso: false,
            mensagem: `Erro na coleta: ${error.message}`,
            detalhes: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// GET /api/juridico/status-sincronizacao - Status da sincronização
router.get('/status-sincronizacao', async (req, res) => {
    try {
        const status = await juridicoServiceInstance.obterStatusSincronizacao();

        res.json(status);
    } catch (error) {
        console.error('Erro ao obter status:', error);
        res.status(500).json({ 
            erro: 'Erro interno do servidor',
            detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/juridico/verificar-prazos - Verificar prazos urgentes
router.get('/verificar-prazos', async (req, res) => {
    try {
        const alertas = await juridicoServiceInstance.verificarPrazosUrgentes(req.user.id);

        res.json({ alertas });
    } catch (error) {
        console.error('Erro ao verificar prazos:', error);
        res.status(500).json({ 
            erro: 'Erro interno do servidor',
            detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/juridico/intimacoes/:id/download/:tipo - Download de documentos
router.get('/intimacoes/:id/download/:tipo', async (req, res) => {
    try {
        const { id, tipo } = req.params;

        // Validar ID
        const idValidation = Joi.number().integer().positive().validate(id);
        if (idValidation.error) {
            return res.status(400).json({ 
                erro: 'ID inválido',
                detalhes: 'ID deve ser um número inteiro positivo'
            });
        }

        // Validar tipo
        const tipoValidation = Joi.string().valid('intimacao', 'parecer', 'minuta').validate(tipo);
        if (tipoValidation.error) {
            return res.status(400).json({ 
                erro: 'Tipo de documento inválido',
                detalhes: 'Tipo deve ser: intimacao, parecer ou minuta'
            });
        }

        const intimacao = await juridicoServiceInstance.buscarIntimacaoPorId(id);

        if (!intimacao) {
            return res.status(404).json({ erro: 'Intimação não encontrada' });
        }

        if (intimacao.advogado_id !== req.user.id) {
            return res.status(403).json({ erro: 'Acesso negado' });
        }

        let caminhoArquivo;
        let nomeArquivo;

        switch (tipo) {
            case 'intimacao':
                caminhoArquivo = intimacao.caminhoArquivo;
                nomeArquivo = `intimacao_${intimacao.numeroProcesso}.pdf`;
                break;
            case 'parecer':
                caminhoArquivo = await juridicoServiceInstance.gerarPDFParecer(intimacao);
                nomeArquivo = `parecer_${intimacao.numeroProcesso}.pdf`;
                break;
            case 'minuta':
                caminhoArquivo = await juridicoServiceInstance.gerarPDFMinuta(intimacao);
                nomeArquivo = `minuta_${intimacao.numeroProcesso}.pdf`;
                break;
        }

        if (!caminhoArquivo || !require('fs').existsSync(caminhoArquivo)) {
            return res.status(404).json({ erro: 'Arquivo não encontrado' });
        }

        res.download(caminhoArquivo, nomeArquivo);
    } catch (error) {
        console.error('Erro no download:', error);
        res.status(500).json({ 
            erro: 'Erro interno do servidor',
            detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/juridico/intimacoes/:id/notas - Adicionar/atualizar notas do advogado
router.post('/intimacoes/:id/notas', validationMiddleware(notasSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { notas } = req.body;

        // Validar ID
        const idValidation = Joi.number().integer().positive().validate(id);
        if (idValidation.error) {
            return res.status(400).json({ 
                erro: 'ID inválido',
                detalhes: 'ID deve ser um número inteiro positivo'
            });
        }

        const intimacao = await juridicoServiceInstance.buscarIntimacaoPorId(id);

        if (!intimacao) {
            return res.status(404).json({ erro: 'Intimação não encontrada' });
        }

        if (intimacao.advogado_id !== req.user.id) {
            return res.status(403).json({ erro: 'Acesso negado' });
        }

        await juridicoServiceInstance.atualizarNotasIntimacao(id, notas);

        res.json({ sucesso: true, mensagem: 'Notas atualizadas com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar notas:', error);
        res.status(500).json({ 
            erro: 'Erro interno do servidor',
            detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/juridico/processos-similares/:id - Buscar processos similares
router.get('/processos-similares/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validar ID
        const idValidation = Joi.number().integer().positive().validate(id);
        if (idValidation.error) {
            return res.status(400).json({ 
                erro: 'ID inválido',
                detalhes: 'ID deve ser um número inteiro positivo'
            });
        }

        const intimacao = await juridicoServiceInstance.buscarIntimacaoPorId(id);

        if (!intimacao) {
            return res.status(404).json({ erro: 'Intimação não encontrada' });
        }

        if (intimacao.advogado_id !== req.user.id) {
            return res.status(403).json({ erro: 'Acesso negado' });
        }

        const processosSimilares = await processadorNLPInstance.reconhecerProcessosSimilares(
            intimacao.teor,
            await juridicoServiceInstance.buscarIntimacoesAdvogado(req.user.id)
        );

        res.json(processosSimilares);
    } catch (error) {
        console.error('Erro ao buscar processos similares:', error);
        res.status(500).json({ 
            erro: 'Erro interno do servidor',
            detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/juridico/reprocessar/:id - Reprocessar intimação com IA/NLP
router.post('/reprocessar/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validar ID
        const idValidation = Joi.number().integer().positive().validate(id);
        if (idValidation.error) {
            return res.status(400).json({ 
                erro: 'ID inválido',
                detalhes: 'ID deve ser um número inteiro positivo'
            });
        }

        const intimacao = await juridicoServiceInstance.buscarIntimacaoPorId(id);

        if (!intimacao) {
            return res.status(404).json({ erro: 'Intimação não encontrada' });
        }

        if (intimacao.advogado_id !== req.user.id) {
            return res.status(403).json({ erro: 'Acesso negado' });
        }

        // Reprocessar com IA/NLP
        const resultadoProcessamento = await processadorNLPInstance.processarIntimacaoCompleta(
            intimacao.caminhoArquivo
        );

        // Atualizar intimação com novos dados
        await juridicoServiceInstance.atualizarIntimacaoComProcessamento(id, resultadoProcessamento);

        res.json({
            sucesso: true,
            mensagem: 'Intimação reprocessada com sucesso',
            dados: resultadoProcessamento
        });
    } catch (error) {
        console.error('Erro no reprocessamento:', error);
        res.status(500).json({ 
            erro: 'Erro interno do servidor',
            detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/juridico/estatisticas - Estatísticas do módulo jurídico
router.get('/estatisticas', async (req, res) => {
    try {
        const estatisticas = await juridicoServiceInstance.obterEstatisticas(req.user.id);

        res.json(estatisticas);
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({ 
            erro: 'Erro interno do servidor',
            detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/juridico/configurar-credenciais - Configurar credenciais de acesso aos portais
router.post('/configurar-credenciais', validationMiddleware(credenciaisSchema), async (req, res) => {
    try {
        const { numeroOAB, usuarioPJE, senhaPJE, tribunal } = req.body;

        await juridicoServiceInstance.configurarCredenciaisAdvogado(req.user.id, {
            numeroOAB,
            usuarioPJE,
            senhaPJE,
            tribunal
        });

        res.json({ sucesso: true, mensagem: 'Credenciais configuradas com sucesso' });
    } catch (error) {
        console.error('Erro ao configurar credenciais:', error);
        res.status(500).json({ 
            erro: 'Erro interno do servidor',
            detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ===== NOVAS ROTAS FASE 1 =====

// Variáveis para os novos serviços
let documentServiceInstance;
let activityServiceInstance;

// Função para definir as instâncias dos novos serviços
router.setNewServices = (documentService, activityService) => {
    documentServiceInstance = documentService;
    activityServiceInstance = activityService;
};

// POST /api/juridico/intimacoes/:id/notas - Adicionar/atualizar notas do advogado
router.post('/intimacoes/:id/notas', validationMiddleware(require('../middleware/validation').notasAdvogadoSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { notas_advogado } = req.body;

        // Validar ID
        const idValidation = Joi.number().integer().positive().validate(id);
        if (idValidation.error) {
            return res.status(400).json({ 
                erro: 'ID inválido',
                detalhes: 'ID deve ser um número inteiro positivo'
            });
        }

        const intimacao = await juridicoServiceInstance.buscarIntimacaoPorId(id);

        if (!intimacao) {
            return res.status(404).json({ erro: 'Intimação não encontrada' });
        }

        if (intimacao.advogado_id !== req.user.id) {
            return res.status(403).json({ erro: 'Acesso negado' });
        }

        // Atualizar notas
        const intimacaoAtualizada = await juridicoServiceInstance.atualizarIntimacao(id, {
            notas_advogado
        });

        // Registrar atividade
        if (activityServiceInstance) {
            await activityServiceInstance.registrarAtividadeAutomatica(
                'nota_adicionada',
                id,
                intimacao.processo_id,
                { notas_advogado }
            );
        }

        res.json(intimacaoAtualizada);
    } catch (error) {
        console.error('Erro ao atualizar notas do advogado:', error);
        res.status(500).json({ 
            erro: 'Erro interno do servidor',
            detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/juridico/intimacoes/:id/download/parecer-word - Download do parecer em Word
router.get('/intimacoes/:id/download/parecer-word', async (req, res) => {
    try {
        const { id } = req.params;

        // Validar ID
        const idValidation = Joi.number().integer().positive().validate(id);
        if (idValidation.error) {
            return res.status(400).json({ 
                erro: 'ID inválido',
                detalhes: 'ID deve ser um número inteiro positivo'
            });
        }

        const intimacao = await juridicoServiceInstance.buscarIntimacaoPorId(id);

        if (!intimacao) {
            return res.status(404).json({ erro: 'Intimação não encontrada' });
        }

        if (intimacao.advogado_id !== req.user.id) {
            return res.status(403).json({ erro: 'Acesso negado' });
        }

        if (!intimacao.parecer) {
            return res.status(404).json({ erro: 'Parecer não disponível para esta intimação' });
        }

        if (!documentServiceInstance) {
            return res.status(503).json({ erro: 'Serviço de documentos não disponível' });
        }

        // Buscar dados do processo e cliente se disponível
        let processo = null;
        let cliente = null;

        if (intimacao.processo_id) {
            // Aqui você precisaria implementar a busca do processo e cliente
            // processo = await processoService.buscarProcessoPorId(intimacao.processo_id);
            // if (processo) {
            //     const clientes = await clientService.buscarClientesDoProcesso(processo.id);
            //     cliente = clientes[0]; // Pegar o primeiro cliente
            // }
        }

        const documento = await documentServiceInstance.gerarWordParecer(intimacao, processo, cliente);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${documento.fileName}"`);
        
        res.send(documento.buffer);

        // Limpar arquivo temporário após envio
        setTimeout(() => {
            documentServiceInstance.removerArquivo(documento.filePath);
        }, 5000);

    } catch (error) {
        console.error('Erro ao gerar documento Word do parecer:', error);
        res.status(500).json({ 
            erro: 'Erro interno do servidor',
            detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/juridico/intimacoes/:id/download/minuta-word - Download da minuta em Word
router.get('/intimacoes/:id/download/minuta-word', async (req, res) => {
    try {
        const { id } = req.params;

        // Validar ID
        const idValidation = Joi.number().integer().positive().validate(id);
        if (idValidation.error) {
            return res.status(400).json({ 
                erro: 'ID inválido',
                detalhes: 'ID deve ser um número inteiro positivo'
            });
        }

        const intimacao = await juridicoServiceInstance.buscarIntimacaoPorId(id);

        if (!intimacao) {
            return res.status(404).json({ erro: 'Intimação não encontrada' });
        }

        if (intimacao.advogado_id !== req.user.id) {
            return res.status(403).json({ erro: 'Acesso negado' });
        }

        if (!intimacao.minuta_resposta) {
            return res.status(404).json({ erro: 'Minuta não disponível para esta intimação' });
        }

        if (!documentServiceInstance) {
            return res.status(503).json({ erro: 'Serviço de documentos não disponível' });
        }

        // Buscar dados do processo e cliente se disponível
        let processo = null;
        let cliente = null;

        if (intimacao.processo_id) {
            // Aqui você precisaria implementar a busca do processo e cliente
            // processo = await processoService.buscarProcessoPorId(intimacao.processo_id);
            // if (processo) {
            //     const clientes = await clientService.buscarClientesDoProcesso(processo.id);
            //     cliente = clientes[0]; // Pegar o primeiro cliente
            // }
        }

        const documento = await documentServiceInstance.gerarWordMinuta(intimacao, processo, cliente);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${documento.fileName}"`);
        
        res.send(documento.buffer);

        // Limpar arquivo temporário após envio
        setTimeout(() => {
            documentServiceInstance.removerArquivo(documento.filePath);
        }, 5000);

    } catch (error) {
        console.error('Erro ao gerar documento Word da minuta:', error);
        res.status(500).json({ 
            erro: 'Erro interno do servidor',
            detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;


