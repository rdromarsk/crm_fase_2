const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles, checkProcessAccess } = require('../middleware/auth');
const { 
    atividadeSchema,
    validationMiddleware,
    sanitizeInput 
} = require('../middleware/validation');

// Variável para armazenar a instância do serviço
let activityServiceInstance;

// Função para definir a instância do serviço (chamada pelo server.js)
router.setServices = (activityService) => {
    activityServiceInstance = activityService;
};

// Middleware de sanitização para todas as rotas
router.use(sanitizeInput);

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// GET /api/atividades/intimacao/:intimacaoId - Buscar atividades de uma intimação
router.get('/intimacao/:intimacaoId', 
    authorizeRoles('admin', 'lawyer', 'assistant'),
    async (req, res) => {
        try {
            const intimacaoId = parseInt(req.params.intimacaoId);
            
            if (isNaN(intimacaoId)) {
                return res.status(400).json({ error: 'ID da intimação inválido' });
            }

            const incluirPrivadas = req.user.role !== 'client';
            const atividades = await activityServiceInstance.buscarAtividadesIntimacao(intimacaoId, incluirPrivadas);
            
            res.json(atividades);
        } catch (error) {
            console.error('Erro ao buscar atividades da intimação:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// GET /api/atividades/processo/:processoId - Buscar atividades de um processo
router.get('/processo/:processoId', 
    authorizeRoles('admin', 'lawyer', 'assistant'),
    checkProcessAccess,
    async (req, res) => {
        try {
            const processoId = parseInt(req.params.processoId);
            
            if (isNaN(processoId)) {
                return res.status(400).json({ error: 'ID do processo inválido' });
            }

            const incluirPrivadas = req.user.role !== 'client';
            const atividades = await activityServiceInstance.buscarAtividadesProcesso(processoId, incluirPrivadas);
            
            res.json(atividades);
        } catch (error) {
            console.error('Erro ao buscar atividades do processo:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// GET /api/atividades/atribuidas - Buscar atividades atribuídas ao usuário
router.get('/atribuidas', 
    authorizeRoles('admin', 'lawyer', 'assistant'),
    async (req, res) => {
        try {
            const status = req.query.status;
            const atividades = await activityServiceInstance.buscarAtividadesAtribuidas(req.user.id, status);
            
            res.json(atividades);
        } catch (error) {
            console.error('Erro ao buscar atividades atribuídas:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// GET /api/atividades/estatisticas - Buscar estatísticas de atividades do usuário
router.get('/estatisticas', 
    authorizeRoles('admin', 'lawyer', 'assistant'),
    async (req, res) => {
        try {
            const periodo = req.query.periodo ? parseInt(req.query.periodo) : 30;
            const estatisticas = await activityServiceInstance.buscarEstatisticasAtividades(req.user.id, periodo);
            
            res.json(estatisticas);
        } catch (error) {
            console.error('Erro ao buscar estatísticas de atividades:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// POST /api/atividades - Registrar nova atividade
router.post('/', 
    authorizeRoles('admin', 'lawyer', 'assistant'),
    validationMiddleware(atividadeSchema),
    async (req, res) => {
        try {
            const dadosAtividade = {
                ...req.body,
                user_id: req.user.id // Associar ao usuário logado
            };

            const novaAtividade = await activityServiceInstance.registrarAtividade(dadosAtividade);
            res.status(201).json(novaAtividade);
        } catch (error) {
            console.error('Erro ao registrar atividade:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// POST /api/atividades/externa - Registrar atividade externa
router.post('/externa', 
    authorizeRoles('admin', 'lawyer', 'assistant'),
    async (req, res) => {
        try {
            const { processo_id, description, data_atividade, local, observacoes } = req.body;

            if (!processo_id || !description) {
                return res.status(400).json({ error: 'Processo ID e descrição são obrigatórios' });
            }

            const dadosAtividade = {
                processo_id,
                user_id: req.user.id,
                description,
                data_atividade,
                local,
                observacoes
            };

            const atividadeExterna = await activityServiceInstance.registrarAtividadeExterna(dadosAtividade);
            res.status(201).json(atividadeExterna);
        } catch (error) {
            console.error('Erro ao registrar atividade externa:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// PUT /api/atividades/:id - Atualizar atividade
router.put('/:id', 
    authorizeRoles('admin', 'lawyer', 'assistant'),
    async (req, res) => {
        try {
            const activityId = parseInt(req.params.id);
            
            if (isNaN(activityId)) {
                return res.status(400).json({ error: 'ID da atividade inválido' });
            }

            const atividadeAtualizada = await activityServiceInstance.atualizarAtividade(activityId, req.body);
            
            if (!atividadeAtualizada) {
                return res.status(404).json({ error: 'Atividade não encontrada' });
            }

            res.json(atividadeAtualizada);
        } catch (error) {
            console.error('Erro ao atualizar atividade:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// POST /api/atividades/:id/cumprida - Marcar atividade como cumprida
router.post('/:id/cumprida', 
    authorizeRoles('admin', 'lawyer', 'assistant'),
    async (req, res) => {
        try {
            const activityId = parseInt(req.params.id);
            
            if (isNaN(activityId)) {
                return res.status(400).json({ error: 'ID da atividade inválido' });
            }

            const atividadeCumprida = await activityServiceInstance.marcarAtividadeCumprida(activityId, req.user.id);
            
            if (!atividadeCumprida) {
                return res.status(404).json({ error: 'Atividade não encontrada' });
            }

            res.json(atividadeCumprida);
        } catch (error) {
            console.error('Erro ao marcar atividade como cumprida:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// POST /api/atividades/:id/delegar - Delegar atividade
router.post('/:id/delegar', 
    authorizeRoles('admin', 'lawyer'),
    async (req, res) => {
        try {
            const activityId = parseInt(req.params.id);
            const { assigned_to_user_id } = req.body;
            
            if (isNaN(activityId) || !assigned_to_user_id) {
                return res.status(400).json({ error: 'Dados inválidos' });
            }

            const atividadeDelegada = await activityServiceInstance.delegarAtividade(
                activityId, 
                assigned_to_user_id, 
                req.user.id
            );
            
            if (!atividadeDelegada) {
                return res.status(404).json({ error: 'Atividade não encontrada' });
            }

            res.json(atividadeDelegada);
        } catch (error) {
            console.error('Erro ao delegar atividade:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

module.exports = router;