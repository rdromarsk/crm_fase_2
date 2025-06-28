const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles, checkProcessAccess } = require('../middleware/auth');
const { 
    processoNovoSchema,
    validationMiddleware,
    sanitizeInput 
} = require('../middleware/validation');

// Variáveis para armazenar as instâncias dos serviços
let processoServiceInstance;
let clientServiceInstance;

// Função para definir as instâncias dos serviços (chamada pelo server.js)
router.setServices = (processoService, clientService) => {
    processoServiceInstance = processoService;
    clientServiceInstance = clientService;
};

// Middleware de sanitização para todas as rotas
router.use(sanitizeInput);

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// GET /api/processos - Buscar processos do advogado
router.get('/', authorizeRoles('admin', 'lawyer', 'assistant'), async (req, res) => {
    try {
        const filtros = {
            numero_processo: req.query.numero_processo,
            status: req.query.status,
            tribunal: req.query.tribunal,
            tipo_acao: req.query.tipo_acao,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined
        };

        const processos = await processoServiceInstance.buscarProcessosDoAdvogado(req.user.id, filtros);
        res.json(processos);
    } catch (error) {
        console.error('Erro ao buscar processos:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/processos/:id - Buscar processo por ID
router.get('/:id', 
    authorizeRoles('admin', 'lawyer', 'assistant'),
    checkProcessAccess,
    async (req, res) => {
        try {
            const processoId = parseInt(req.params.id);
            
            if (isNaN(processoId)) {
                return res.status(400).json({ error: 'ID do processo inválido' });
            }

            const processo = await processoServiceInstance.buscarProcessoPorId(processoId);
            
            if (!processo) {
                return res.status(404).json({ error: 'Processo não encontrado' });
            }

            res.json(processo);
        } catch (error) {
            console.error('Erro ao buscar processo:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// GET /api/processos/:id/detalhes - Buscar detalhes completos do processo
router.get('/:id/detalhes', 
    authorizeRoles('admin', 'lawyer', 'assistant'),
    checkProcessAccess,
    async (req, res) => {
        try {
            const processoId = parseInt(req.params.id);
            
            if (isNaN(processoId)) {
                return res.status(400).json({ error: 'ID do processo inválido' });
            }

            const detalhes = await processoServiceInstance.buscarDetalhesProcesso(processoId);
            
            if (!detalhes) {
                return res.status(404).json({ error: 'Processo não encontrado' });
            }

            res.json(detalhes);
        } catch (error) {
            console.error('Erro ao buscar detalhes do processo:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// GET /api/processos/:id/estatisticas - Buscar estatísticas do processo
router.get('/:id/estatisticas', 
    authorizeRoles('admin', 'lawyer', 'assistant'),
    checkProcessAccess,
    async (req, res) => {
        try {
            const processoId = parseInt(req.params.id);
            
            if (isNaN(processoId)) {
                return res.status(400).json({ error: 'ID do processo inválido' });
            }

            const estatisticas = await processoServiceInstance.buscarEstatisticasProcesso(processoId);
            res.json(estatisticas);
        } catch (error) {
            console.error('Erro ao buscar estatísticas do processo:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// POST /api/processos - Criar novo processo
router.post('/', 
    authorizeRoles('admin', 'lawyer'),
    validationMiddleware(processoNovoSchema),
    async (req, res) => {
        try {
            const dadosProcesso = {
                ...req.body,
                advogado_id: req.user.id // Associar ao usuário logado
            };

            const novoProcesso = await processoServiceInstance.criarProcesso(dadosProcesso);
            res.status(201).json(novoProcesso);
        } catch (error) {
            console.error('Erro ao criar processo:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// PUT /api/processos/:id - Atualizar processo
router.put('/:id', 
    authorizeRoles('admin', 'lawyer'),
    checkProcessAccess,
    async (req, res) => {
        try {
            const processoId = parseInt(req.params.id);
            
            if (isNaN(processoId)) {
                return res.status(400).json({ error: 'ID do processo inválido' });
            }

            const processoAtualizado = await processoServiceInstance.atualizarProcesso(processoId, req.body);
            
            if (!processoAtualizado) {
                return res.status(404).json({ error: 'Processo não encontrado' });
            }

            res.json(processoAtualizado);
        } catch (error) {
            console.error('Erro ao atualizar processo:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// GET /api/processos/:id/clientes - Buscar clientes vinculados ao processo
router.get('/:id/clientes', 
    authorizeRoles('admin', 'lawyer', 'assistant'),
    checkProcessAccess,
    async (req, res) => {
        try {
            const processoId = parseInt(req.params.id);
            
            if (isNaN(processoId)) {
                return res.status(400).json({ error: 'ID do processo inválido' });
            }

            const clientes = await clientServiceInstance.buscarClientesDoProcesso(processoId);
            res.json(clientes);
        } catch (error) {
            console.error('Erro ao buscar clientes do processo:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// POST /api/processos/:id/colaboradores - Adicionar colaborador ao processo
router.post('/:id/colaboradores',
    authorizeRoles('admin', 'lawyer'),
    checkProcessAccess,
    async (req, res) => {
        try {
            const processoId = parseInt(req.params.id);
            const { user_id, role_in_process } = req.body;

            if (isNaN(processoId) || !user_id) {
                return res.status(400).json({ error: 'Dados inválidos' });
            }

            const colaborador = await processoServiceInstance.adicionarColaborador(
                processoId, 
                user_id, 
                role_in_process || 'colaborador'
            );

            res.status(201).json(colaborador);
        } catch (error) {
            console.error('Erro ao adicionar colaborador:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// DELETE /api/processos/:id/colaboradores/:userId - Remover colaborador do processo
router.delete('/:id/colaboradores/:userId',
    authorizeRoles('admin', 'lawyer'),
    checkProcessAccess,
    async (req, res) => {
        try {
            const processoId = parseInt(req.params.id);
            const userId = parseInt(req.params.userId);

            if (isNaN(processoId) || isNaN(userId)) {
                return res.status(400).json({ error: 'IDs inválidos' });
            }

            const sucesso = await processoServiceInstance.removerColaborador(processoId, userId);
            
            if (!sucesso) {
                return res.status(404).json({ error: 'Colaborador não encontrado' });
            }

            res.json({ message: 'Colaborador removido com sucesso' });
        } catch (error) {
            console.error('Erro ao remover colaborador:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// GET /api/processos/numero/:numeroProcesso - Buscar processo por número
router.get('/numero/:numeroProcesso', 
    authorizeRoles('admin', 'lawyer', 'assistant'),
    async (req, res) => {
        try {
            const numeroProcesso = req.params.numeroProcesso;
            
            if (!numeroProcesso) {
                return res.status(400).json({ error: 'Número do processo é obrigatório' });
            }

            const processo = await processoServiceInstance.buscarProcessoPorNumero(numeroProcesso);
            
            if (!processo) {
                return res.status(404).json({ error: 'Processo não encontrado' });
            }

            // Verificar se o usuário tem acesso ao processo
            const temAcesso = await processoServiceInstance.verificarAcessoProcesso(processo.id, req.user.id);
            
            if (!temAcesso) {
                return res.status(403).json({ error: 'Acesso negado ao processo' });
            }

            res.json(processo);
        } catch (error) {
            console.error('Erro ao buscar processo por número:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

module.exports = router;