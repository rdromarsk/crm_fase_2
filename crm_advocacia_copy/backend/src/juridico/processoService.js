const { Pool } = require('pg');

class ProcessoService {
    constructor() {
        this.pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'crm_advocacia',
            password: process.env.DB_PASSWORD || 'password',
            port: process.env.DB_PORT || 5432,
        });
    }

    // Criar novo processo
    async criarProcesso(dadosProcesso) {
        const {
            numero_processo,
            advogado_id,
            tribunal,
            tipo_acao,
            valor_causa,
            observacoes
        } = dadosProcesso;

        const query = `
            INSERT INTO processos (
                numero_processo, advogado_id, tribunal, 
                tipo_acao, valor_causa, observacoes
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const values = [
            numero_processo, advogado_id, tribunal,
            tipo_acao, valor_causa, observacoes
        ];

        try {
            const result = await this.pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Erro ao criar processo:', error);
            throw new Error('Erro interno do servidor ao criar processo');
        }
    }

    // Buscar processo por ID
    async buscarProcessoPorId(processoId) {
        const query = 'SELECT * FROM processos WHERE id = $1';
        
        try {
            const result = await this.pool.query(query, [processoId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erro ao buscar processo:', error);
            throw new Error('Erro interno do servidor ao buscar processo');
        }
    }

    // Buscar processo por número
    async buscarProcessoPorNumero(numeroProcesso) {
        const query = 'SELECT * FROM processos WHERE numero_processo = $1';
        
        try {
            const result = await this.pool.query(query, [numeroProcesso]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erro ao buscar processo por número:', error);
            throw new Error('Erro interno do servidor ao buscar processo');
        }
    }

    // Buscar processos do advogado com filtros
    async buscarProcessosDoAdvogado(advogadoId, filtros = {}) {
        let query = `
            SELECT p.*, 
                   COUNT(i.id) as total_intimacoes,
                   MAX(i.data_disponibilizacao) as ultima_intimacao
            FROM processos p
            LEFT JOIN intimacoes i ON p.id = i.processo_id
            WHERE p.advogado_id = $1
        `;
        
        const values = [advogadoId];
        let paramCount = 1;

        if (filtros.numero_processo) {
            paramCount++;
            query += ` AND p.numero_processo ILIKE $${paramCount}`;
            values.push(`%${filtros.numero_processo}%`);
        }

        if (filtros.status) {
            paramCount++;
            query += ` AND p.status = $${paramCount}`;
            values.push(filtros.status);
        }

        if (filtros.tribunal) {
            paramCount++;
            query += ` AND p.tribunal = $${paramCount}`;
            values.push(filtros.tribunal);
        }

        if (filtros.tipo_acao) {
            paramCount++;
            query += ` AND p.tipo_acao ILIKE $${paramCount}`;
            values.push(`%${filtros.tipo_acao}%`);
        }

        query += `
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `;

        if (filtros.limit) {
            paramCount++;
            query += ` LIMIT $${paramCount}`;
            values.push(filtros.limit);
        }

        try {
            const result = await this.pool.query(query, values);
            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar processos do advogado:', error);
            throw new Error('Erro interno do servidor ao buscar processos');
        }
    }

    // Buscar detalhes completos do processo
    async buscarDetalhesProcesso(processoId) {
        try {
            // Buscar dados do processo
            const processoQuery = 'SELECT * FROM processos WHERE id = $1';
            const processoResult = await this.pool.query(processoQuery, [processoId]);
            
            if (processoResult.rows.length === 0) {
                return null;
            }

            const processo = processoResult.rows[0];

            // Buscar intimações do processo
            const intimacoesQuery = `
                SELECT * FROM intimacoes 
                WHERE processo_id = $1 
                ORDER BY data_disponibilizacao DESC
            `;
            const intimacoesResult = await this.pool.query(intimacoesQuery, [processoId]);

            // Buscar clientes vinculados
            const clientesQuery = `
                SELECT c.*, pc.tipo_participacao
                FROM clients c
                INNER JOIN processo_clientes pc ON c.id = pc.client_id
                WHERE pc.processo_id = $1
                ORDER BY c.nome_completo, c.name
            `;
            const clientesResult = await this.pool.query(clientesQuery, [processoId]);

            // Buscar usuários vinculados (colaboradores)
            const usuariosQuery = `
                SELECT u.id, u.name, u.email, pu.role_in_process
                FROM users u
                INNER JOIN processo_users pu ON u.id = pu.user_id
                WHERE pu.processo_id = $1
                ORDER BY u.name
            `;
            const usuariosResult = await this.pool.query(usuariosQuery, [processoId]);

            return {
                ...processo,
                intimacoes: intimacoesResult.rows,
                clientes: clientesResult.rows,
                colaboradores: usuariosResult.rows
            };
        } catch (error) {
            console.error('Erro ao buscar detalhes do processo:', error);
            throw new Error('Erro interno do servidor ao buscar detalhes do processo');
        }
    }

    // Atualizar processo
    async atualizarProcesso(processoId, dadosAtualizacao) {
        const campos = [];
        const values = [];
        let paramCount = 0;

        // Campos permitidos para atualização
        const camposPermitidos = [
            'tribunal', 'tipo_acao', 'valor_causa', 'status', 'observacoes'
        ];

        camposPermitidos.forEach(campo => {
            if (dadosAtualizacao[campo] !== undefined) {
                paramCount++;
                campos.push(`${campo} = $${paramCount}`);
                values.push(dadosAtualizacao[campo]);
            }
        });

        if (campos.length === 0) {
            throw new Error('Nenhum campo válido para atualização');
        }

        paramCount++;
        values.push(processoId);

        const query = `
            UPDATE processos 
            SET ${campos.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        try {
            const result = await this.pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erro ao atualizar processo:', error);
            throw new Error('Erro interno do servidor ao atualizar processo');
        }
    }

    // Adicionar colaborador ao processo
    async adicionarColaborador(processoId, userId, roleInProcess = 'colaborador') {
        const query = `
            INSERT INTO processo_users (processo_id, user_id, role_in_process)
            VALUES ($1, $2, $3)
            ON CONFLICT (processo_id, user_id) 
            DO UPDATE SET role_in_process = EXCLUDED.role_in_process
            RETURNING *
        `;

        try {
            const result = await this.pool.query(query, [processoId, userId, roleInProcess]);
            return result.rows[0];
        } catch (error) {
            console.error('Erro ao adicionar colaborador ao processo:', error);
            throw new Error('Erro interno do servidor ao adicionar colaborador');
        }
    }

    // Remover colaborador do processo
    async removerColaborador(processoId, userId) {
        const query = 'DELETE FROM processo_users WHERE processo_id = $1 AND user_id = $2';

        try {
            const result = await this.pool.query(query, [processoId, userId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Erro ao remover colaborador do processo:', error);
            throw new Error('Erro interno do servidor ao remover colaborador');
        }
    }

    // Verificar se usuário tem acesso ao processo
    async verificarAcessoProcesso(processoId, userId) {
        const query = `
            SELECT 1 FROM processos p
            WHERE p.id = $1 AND (
                p.advogado_id = $2 OR
                EXISTS (SELECT 1 FROM processo_users pu WHERE pu.processo_id = $1 AND pu.user_id = $2)
            )
        `;

        try {
            const result = await this.pool.query(query, [processoId, userId]);
            return result.rows.length > 0;
        } catch (error) {
            console.error('Erro ao verificar acesso ao processo:', error);
            throw new Error('Erro interno do servidor ao verificar acesso');
        }
    }

    // Buscar estatísticas do processo
    async buscarEstatisticasProcesso(processoId) {
        const query = `
            SELECT 
                COUNT(i.id) as total_intimacoes,
                COUNT(CASE WHEN i.status = 'pendente' THEN 1 END) as intimacoes_pendentes,
                COUNT(CASE WHEN i.status = 'cumprida' THEN 1 END) as intimacoes_cumpridas,
                MIN(i.data_disponibilizacao) as primeira_intimacao,
                MAX(i.data_disponibilizacao) as ultima_intimacao,
                COUNT(DISTINCT pc.client_id) as total_clientes
            FROM processos p
            LEFT JOIN intimacoes i ON p.id = i.processo_id
            LEFT JOIN processo_clientes pc ON p.id = pc.processo_id
            WHERE p.id = $1
            GROUP BY p.id
        `;

        try {
            const result = await this.pool.query(query, [processoId]);
            return result.rows[0] || {
                total_intimacoes: 0,
                intimacoes_pendentes: 0,
                intimacoes_cumpridas: 0,
                primeira_intimacao: null,
                ultima_intimacao: null,
                total_clientes: 0
            };
        } catch (error) {
            console.error('Erro ao buscar estatísticas do processo:', error);
            throw new Error('Erro interno do servidor ao buscar estatísticas');
        }
    }
}

module.exports = ProcessoService;