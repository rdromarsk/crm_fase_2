const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles, checkPermission } = require('../middleware/auth');
const { 
    clienteNovoSchema, 
    vinculoClienteProcessoSchema,
    validationMiddleware,
    sanitizeInput 
} = require('../middleware/validation');

// Variável para armazenar a instância do serviço
let clientServiceInstance;

// Função para definir a instância do serviço (chamada pelo server.js)
router.setServices = (clientService) => {
    clientServiceInstance = clientService;
};

// Middleware de sanitização para todas as rotas
router.use(sanitizeInput);

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// GET /api/clientes - Buscar clientes
router.get('/', authorizeRoles('admin', 'lawyer', 'assistant'), async (req, res) => {
    try {
        const filtros = {
            nome: req.query.nome,
            email: req.query.email,
            cpf_cnpj: req.query.cpf_cnpj,
            status: req.query.status,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined
        };

        const clientes = await clientServiceInstance.buscarClientes(filtros);
        res.json(clientes);
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/clientes/:id - Buscar cliente por ID
router.get('/:id', authorizeRoles('admin', 'lawyer', 'assistant'), async (req, res) => {
    try {
        const clienteId = parseInt(req.params.id);
        
        if (isNaN(clienteId)) {
            return res.status(400).json({ error: 'ID do cliente inválido' });
        }

        const cliente = await clientServiceInstance.buscarClientePorId(clienteId);
        
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        res.json(cliente);
    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/clientes - Criar novo cliente
router.post('/', 
    authorizeRoles('admin', 'lawyer', 'assistant'),
    validationMiddleware(clienteNovoSchema),
    async (req, res) => {
        try {
            const dadosCliente = {
                ...req.body,
                user_id: req.user.id // Associar ao usuário logado
            };

            const novoCliente = await clientServiceInstance.criarCliente(dadosCliente);
            res.status(201).json(novoCliente);
        } catch (error) {
            console.error('Erro ao criar cliente:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// PUT /api/clientes/:id - Atualizar cliente
router.put('/:id', 
    authorizeRoles('admin', 'lawyer', 'assistant'),
    async (req, res) => {
        try {
            const clienteId = parseInt(req.params.id);
            
            if (isNaN(clienteId)) {
                return res.status(400).json({ error: 'ID do cliente inválido' });
            }

            // Verificar se o cliente existe
            const clienteExistente = await clientServiceInstance.buscarClientePorId(clienteId);
            if (!clienteExistente) {
                return res.status(404).json({ error: 'Cliente não encontrado' });
            }

            const clienteAtualizado = await clientServiceInstance.atualizarCliente(clienteId, req.body);
            res.json(clienteAtualizado);
        } catch (error) {
            console.error('Erro ao atualizar cliente:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// DELETE /api/clientes/:id - Deletar cliente (soft delete)
router.delete('/:id', 
    authorizeRoles('admin', 'lawyer'),
    async (req, res) => {
        try {
            const clienteId = parseInt(req.params.id);
            
            if (isNaN(clienteId)) {
                return res.status(400).json({ error: 'ID do cliente inválido' });
            }

            const clienteDeletado = await clientServiceInstance.deletarCliente(clienteId);
            
            if (!clienteDeletado) {
                return res.status(404).json({ error: 'Cliente não encontrado' });
            }

            res.json({ message: 'Cliente deletado com sucesso', cliente: clienteDeletado });
        } catch (error) {
            console.error('Erro ao deletar cliente:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// POST /api/clientes/vincular-processo - Vincular cliente a processo
router.post('/vincular-processo',
    authorizeRoles('admin', 'lawyer', 'assistant'),
    validationMiddleware(vinculoClienteProcessoSchema),
    async (req, res) => {
        try {
            const { processo_id, client_id, tipo_participacao } = req.body;

            const vinculo = await clientServiceInstance.vincularClienteAoProcesso(
                processo_id, 
                client_id, 
                tipo_participacao
            );

            res.status(201).json(vinculo);
        } catch (error) {
            console.error('Erro ao vincular cliente ao processo:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// DELETE /api/clientes/desvincular-processo/:processoId/:clienteId - Desvincular cliente do processo
router.delete('/desvincular-processo/:processoId/:clienteId',
    authorizeRoles('admin', 'lawyer'),
    async (req, res) => {
        try {
            const processoId = parseInt(req.params.processoId);
            const clienteId = parseInt(req.params.clienteId);

            if (isNaN(processoId) || isNaN(clienteId)) {
                return res.status(400).json({ error: 'IDs inválidos' });
            }

            const sucesso = await clientServiceInstance.desvincularClienteDoProcesso(processoId, clienteId);
            
            if (!sucesso) {
                return res.status(404).json({ error: 'Vínculo não encontrado' });
            }

            res.json({ message: 'Cliente desvinculado do processo com sucesso' });
        } catch (error) {
            console.error('Erro ao desvincular cliente do processo:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// GET /api/clientes/:id/processos - Buscar processos de um cliente
router.get('/:id/processos', 
    authorizeRoles('admin', 'lawyer', 'assistant'),
    async (req, res) => {
        try {
            const clienteId = parseInt(req.params.id);
            
            if (isNaN(clienteId)) {
                return res.status(400).json({ error: 'ID do cliente inválido' });
            }

            const processos = await clientServiceInstance.buscarProcessosDoCliente(clienteId);
            res.json(processos);
        } catch (error) {
            console.error('Erro ao buscar processos do cliente:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

module.exports = router;