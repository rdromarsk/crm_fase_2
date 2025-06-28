const { Pool } = require('pg');

class ActivityService {
    constructor() {
        this.pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'crm_advocacia',
            password: process.env.DB_PASSWORD || 'password',
            port: process.env.DB_PORT || 5432,
        });
    }

    // Registrar nova atividade
    async registrarAtividade(dadosAtividade) {
        const {
            intimacao_id,
            processo_id,
            user_id,
            assigned_to_user_id,
            type,
            description,
            details_json,
            visible_to_client = false
        } = dadosAtividade;

        const query = `
            INSERT INTO activities (
                intimacao_id, processo_id, user_id, assigned_to_user_id,
                type, description, details_json, visible_to_client
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const values = [
            intimacao_id, processo_id, user_id, assigned_to_user_id,
            type, description, details_json, visible_to_client
        ];

        try {
            const result = await this.pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Erro ao registrar atividade:', error);
            throw new Error('Erro interno do servidor ao registrar atividade');
        }
    }

    // Buscar atividades de uma intimação
    async buscarAtividadesIntimacao(intimacaoId, incluirPrivadas = true) {
        let query = `
            SELECT a.*, u.name as user_name, au.name as assigned_user_name
            FROM activities a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN users au ON a.assigned_to_user_id = au.id
            WHERE a.intimacao_id = $1
        `;

        if (!incluirPrivadas) {
            query += ' AND a.visible_to_client = true';
        }

        query += ' ORDER BY a.timestamp DESC';

        try {
            const result = await this.pool.query(query, [intimacaoId]);
            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar atividades da intimação:', error);
            throw new Error('Erro interno do servidor ao buscar atividades');
        }
    }

    // Buscar atividades de um processo
    async buscarAtividadesProcesso(processoId, incluirPrivadas = true) {
        let query = `
            SELECT a.*, u.name as user_name, au.name as assigned_user_name,
                   i.numero_processo, i.teor as intimacao_teor
            FROM activities a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN users au ON a.assigned_to_user_id = au.id
            LEFT JOIN intimacoes i ON a.intimacao_id = i.id
            WHERE a.processo_id = $1
        `;

        if (!incluirPrivadas) {
            query += ' AND a.visible_to_client = true';
        }

        query += ' ORDER BY a.timestamp DESC';

        try {
            const result = await this.pool.query(query, [processoId]);
            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar atividades do processo:', error);
            throw new Error('Erro interno do servidor ao buscar atividades');
        }
    }

    // Buscar atividades atribuídas a um usuário
    async buscarAtividadesAtribuidas(userId, status = null) {
        let query = `
            SELECT a.*, u.name as user_name, p.numero_processo,
                   i.teor as intimacao_teor
            FROM activities a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN processos p ON a.processo_id = p.id
            LEFT JOIN intimacoes i ON a.intimacao_id = i.id
            WHERE a.assigned_to_user_id = $1
        `;

        const values = [userId];

        if (status) {
            query += ' AND a.details_json->\'status\' = $2';
            values.push(`"${status}"`);
        }

        query += ' ORDER BY a.timestamp DESC';

        try {
            const result = await this.pool.query(query, values);
            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar atividades atribuídas:', error);
            throw new Error('Erro interno do servidor ao buscar atividades atribuídas');
        }
    }

    // Atualizar atividade
    async atualizarAtividade(activityId, dadosAtualizacao) {
        const campos = [];
        const values = [];
        let paramCount = 0;

        // Campos permitidos para atualização
        const camposPermitidos = [
            'assigned_to_user_id', 'description', 'details_json', 'visible_to_client'
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
        values.push(activityId);

        const query = `
            UPDATE activities 
            SET ${campos.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        try {
            const result = await this.pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erro ao atualizar atividade:', error);
            throw new Error('Erro interno do servidor ao atualizar atividade');
        }
    }

    // Marcar atividade como cumprida
    async marcarAtividadeCumprida(activityId, userId) {
        const detailsJson = {
            status: 'cumprida',
            completed_by: userId,
            completed_at: new Date().toISOString()
        };

        return await this.atualizarAtividade(activityId, {
            details_json: detailsJson
        });
    }

    // Delegar atividade
    async delegarAtividade(activityId, assignedToUserId, userId) {
        const detailsJson = {
            status: 'delegada',
            delegated_by: userId,
            delegated_at: new Date().toISOString()
        };

        return await this.atualizarAtividade(activityId, {
            assigned_to_user_id: assignedToUserId,
            details_json: detailsJson
        });
    }

    // Registrar atividade automática (geração de parecer, etc.)
    async registrarAtividadeAutomatica(tipo, intimacaoId, processoId, detalhes = {}) {
        const descriptions = {
            'parecer_gerado': 'Parecer jurídico gerado automaticamente',
            'minuta_gerada': 'Minuta de resposta gerada automaticamente',
            'status_atualizado': 'Status da intimação atualizado',
            'nota_adicionada': 'Nota do advogado adicionada',
            'acao_recomendada': 'Ação recomendada identificada pelo sistema',
            'intimacao_recebida': 'Nova intimação recebida'
        };

        return await this.registrarAtividade({
            intimacao_id: intimacaoId,
            processo_id: processoId,
            user_id: null, // Sistema
            type: tipo,
            description: descriptions[tipo] || 'Atividade do sistema',
            details_json: detalhes,
            visible_to_client: false
        });
    }

    // Registrar atividade externa
    async registrarAtividadeExterna(dadosAtividade) {
        const {
            processo_id,
            user_id,
            description,
            data_atividade,
            local,
            observacoes
        } = dadosAtividade;

        const detailsJson = {
            tipo: 'externa',
            data_atividade,
            local,
            observacoes
        };

        return await this.registrarAtividade({
            processo_id,
            user_id,
            type: 'atividade_externa',
            description,
            details_json: detailsJson,
            visible_to_client: true
        });
    }

    // Buscar estatísticas de atividades
    async buscarEstatisticasAtividades(userId, periodo = 30) {
        const query = `
            SELECT 
                COUNT(*) as total_atividades,
                COUNT(CASE WHEN assigned_to_user_id = $1 THEN 1 END) as atividades_atribuidas,
                COUNT(CASE WHEN user_id = $1 THEN 1 END) as atividades_criadas,
                COUNT(CASE WHEN details_json->>'status' = '"cumprida"' AND assigned_to_user_id = $1 THEN 1 END) as atividades_cumpridas,
                COUNT(CASE WHEN details_json->>'status' IS NULL AND assigned_to_user_id = $1 THEN 1 END) as atividades_pendentes
            FROM activities
            WHERE timestamp >= CURRENT_DATE - INTERVAL '${periodo} days'
            AND (user_id = $1 OR assigned_to_user_id = $1)
        `;

        try {
            const result = await this.pool.query(query, [userId]);
            return result.rows[0];
        } catch (error) {
            console.error('Erro ao buscar estatísticas de atividades:', error);
            throw new Error('Erro interno do servidor ao buscar estatísticas');
        }
    }
}

module.exports = ActivityService;