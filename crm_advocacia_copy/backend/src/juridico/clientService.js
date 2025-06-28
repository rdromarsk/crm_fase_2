const { Pool } = require('pg');

class ClientService {
    constructor() {
        this.pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'crm_advocacia',
            password: process.env.DB_PASSWORD || 'password',
            port: process.env.DB_PORT || 5432,
        });
    }

    // Criar novo cliente
    async criarCliente(dadosCliente) {
        const {
            nome_completo,
            email,
            telefone,
            cpf_cnpj,
            endereco,
            cidade,
            estado,
            cep,
            notas,
            user_id
        } = dadosCliente;

        const query = `
            INSERT INTO clients (
                nome_completo, email, phone, cpf_cnpj, 
                endereco, cidade, estado, zip_code, notes, user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const values = [
            nome_completo, email, telefone, cpf_cnpj,
            endereco, cidade, estado, cep, notas, user_id
        ];

        try {
            const result = await this.pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Erro ao criar cliente:', error);
            throw new Error('Erro interno do servidor ao criar cliente');
        }
    }

    // Buscar cliente por ID
    async buscarClientePorId(clienteId) {
        const query = 'SELECT * FROM clients WHERE id = $1';
        
        try {
            const result = await this.pool.query(query, [clienteId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erro ao buscar cliente:', error);
            throw new Error('Erro interno do servidor ao buscar cliente');
        }
    }

    // Buscar clientes com filtros
    async buscarClientes(filtros = {}) {
        let query = 'SELECT * FROM clients WHERE 1=1';
        const values = [];
        let paramCount = 0;

        if (filtros.nome) {
            paramCount++;
            query += ` AND (nome_completo ILIKE $${paramCount} OR name ILIKE $${paramCount})`;
            values.push(`%${filtros.nome}%`);
        }

        if (filtros.email) {
            paramCount++;
            query += ` AND email ILIKE $${paramCount}`;
            values.push(`%${filtros.email}%`);
        }

        if (filtros.cpf_cnpj) {
            paramCount++;
            query += ` AND cpf_cnpj = $${paramCount}`;
            values.push(filtros.cpf_cnpj);
        }

        if (filtros.status) {
            paramCount++;
            query += ` AND status = $${paramCount}`;
            values.push(filtros.status);
        }

        query += ' ORDER BY nome_completo, name';

        if (filtros.limit) {
            paramCount++;
            query += ` LIMIT $${paramCount}`;
            values.push(filtros.limit);
        }

        try {
            const result = await this.pool.query(query, values);
            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            throw new Error('Erro interno do servidor ao buscar clientes');
        }
    }

    // Atualizar cliente
    async atualizarCliente(clienteId, dadosAtualizacao) {
        const campos = [];
        const values = [];
        let paramCount = 0;

        // Campos permitidos para atualização
        const camposPermitidos = [
            'nome_completo', 'email', 'phone', 'cpf_cnpj',
            'endereco', 'cidade', 'estado', 'zip_code', 'notes', 'status'
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
        values.push(clienteId);

        const query = `
            UPDATE clients 
            SET ${campos.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        try {
            const result = await this.pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erro ao atualizar cliente:', error);
            throw new Error('Erro interno do servidor ao atualizar cliente');
        }
    }

    // Vincular cliente a processo
    async vincularClienteAoProcesso(processoId, clienteId, tipoParticipacao = 'requerente') {
        const query = `
            INSERT INTO processo_clientes (processo_id, client_id, tipo_participacao)
            VALUES ($1, $2, $3)
            ON CONFLICT (processo_id, client_id) 
            DO UPDATE SET tipo_participacao = EXCLUDED.tipo_participacao
            RETURNING *
        `;

        try {
            const result = await this.pool.query(query, [processoId, clienteId, tipoParticipacao]);
            return result.rows[0];
        } catch (error) {
            console.error('Erro ao vincular cliente ao processo:', error);
            throw new Error('Erro interno do servidor ao vincular cliente ao processo');
        }
    }

    // Desvincular cliente do processo
    async desvincularClienteDoProcesso(processoId, clienteId) {
        const query = 'DELETE FROM processo_clientes WHERE processo_id = $1 AND client_id = $2';

        try {
            const result = await this.pool.query(query, [processoId, clienteId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Erro ao desvincular cliente do processo:', error);
            throw new Error('Erro interno do servidor ao desvincular cliente do processo');
        }
    }

    // Buscar clientes vinculados a um processo
    async buscarClientesDoProcesso(processoId) {
        const query = `
            SELECT c.*, pc.tipo_participacao
            FROM clients c
            INNER JOIN processo_clientes pc ON c.id = pc.client_id
            WHERE pc.processo_id = $1
            ORDER BY c.nome_completo, c.name
        `;

        try {
            const result = await this.pool.query(query, [processoId]);
            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar clientes do processo:', error);
            throw new Error('Erro interno do servidor ao buscar clientes do processo');
        }
    }

    // Buscar processos de um cliente
    async buscarProcessosDoCliente(clienteId) {
        const query = `
            SELECT p.*, pc.tipo_participacao
            FROM processos p
            INNER JOIN processo_clientes pc ON p.id = pc.processo_id
            WHERE pc.client_id = $1
            ORDER BY p.created_at DESC
        `;

        try {
            const result = await this.pool.query(query, [clienteId]);
            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar processos do cliente:', error);
            throw new Error('Erro interno do servidor ao buscar processos do cliente');
        }
    }

    // Deletar cliente (soft delete)
    async deletarCliente(clienteId) {
        const query = `
            UPDATE clients 
            SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        try {
            const result = await this.pool.query(query, [clienteId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erro ao deletar cliente:', error);
            throw new Error('Erro interno do servidor ao deletar cliente');
        }
    }
}

module.exports = ClientService;