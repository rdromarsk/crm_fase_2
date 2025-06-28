const { Pool } = require("pg");
const CredentialManager = require('../../utils/CredentialManager');
const cron = require('node-cron'); // Certifique-se de que 'node-cron' está instalado (npm install node-cron)
const ComunicaPJEAutomation = require('./comunicaPJEAutomation');
const PJETJCEAutomation = require('./pjeTJCEAutomation');
const ProcessadorNLP = require('./processadorNLP'); // Importar o ProcessadorNLP

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

class JuridicoService {
    constructor() {
        //this.comunicaAutomation = null;
        //this.pjeAutomation = null;
        this.processadorNLP = new ProcessadorNLP(); // Instanciar o ProcessadorNLP
        this.isProcessing = false;
        this.filaProcessamento = [];

        // Inicializa o CredentialManager
        try {
            this.credentialManager = new CredentialManager();
        } catch (error) {
            console.error('Erro ao inicializar CredentialManager no JuridicoService:', error.message);
            this.credentialManager = null; // Garante que não será usado se a inicialização falhar
        }
    }

    async init() {
        // Estes devem ser inicializados apenas uma vez, idealmente ao iniciar o serviço
        // ou quando necessário. Se já estiverem inicializados, não faça novamente.
        //  if (!this.comunicaAutomation) {
        //      this.comunicaAutomation = new ComunicaPJEAutomation();
        //      await this.comunicaAutomation.init();
        //  }
        //  if (!this.pjeAutomation) {
        //      this.pjeAutomation = new PJETJCEAutomation();
        //      await this.pjeAutomation.init();
        //  }
        
        // Agendar coleta diária apenas se não estiver agendada
        if (!this._dailyCronJob) { // Adicione uma propriedade para controlar o agendamento
            this.agendarColetaDiaria();
        }
    }

    agendarColetaDiaria() {
        // Executar todos os dias às 10:00
        this._dailyCronJob = cron.schedule('0 10 * * *', async () => {
            console.log('Iniciando coleta diária de intimações...');
            try {
                await this.coletarIntimacoesTodosAdvogados();
            } catch (error) {
                console.error('Erro na coleta diária:', error);
            }
        });
        
        console.log('Coleta diária agendada para 10:00');
    }

    async coletarIntimacoesTodosAdvogados() {
        try {
            // Buscar todos os advogados com credenciais cadastradas
            const advogados = await this.buscarAdvogadosComCredenciais();
            
            for (const advogado of advogados) {
                try {
                    await this.coletarIntimacoesAdvogado(advogado);
                } catch (error) {
                    console.error(`Erro ao coletar intimações do advogado ${advogado.oab}:`, error);
                }
            }
        } catch (error) {
            console.error('Erro na coleta de intimações de todos os advogados:', error);
            throw error;
        }
    }

    async coletarIntimacoesAdvogado(advogado, dataInicio = null, dataFim = null) {
        let comunicaAutomationInstance = null;
        try {
            console.log(`Coletando intimações para advogado OAB: ${advogado.oab}`);
            
            console.log("Attempting to create ComunicaPJEAutomation instance...");

            // 1. Inicializa a automação para esta execução específica
            comunicaAutomationInstance = new ComunicaPJEAutomation();
            console.log("ComunicaPJEAutomation instance created. Type:", typeof comunicaAutomationInstance);
            console.log("Attempting to initialize ComunicaPJEAutomation...");
            await comunicaAutomationInstance.init();
            console.log("ComunicaPJEAutomation initialized successfully.");

            // Se não especificado, usar data de hoje
            if (!dataInicio || !dataFim) {
                const hoje = new Date();
                dataFim = hoje.toISOString().split('T')[0];
                
                // Para novos advogados, buscar últimos 30 dias
                // (Lógica para isNovo precisa ser definida ao buscar advogados)
                const diasAtras = 1; // Default para 1 dia, ajuste conforme sua lógica de "novo"
                const dataInicioObj = new Date(hoje);
                dataInicioObj.setDate(dataInicioObj.getDate() - diasAtras);
                dataInicio = dataInicioObj.toISOString().split('T')[0];
            }
            
            // 2. Coletar intimações usando a instância local
            console.log("Attempting to call coletarIntimacoes on ComunicaPJEAutomation instance.");
            // Adicione uma verificação robusta antes de chamar
            if (!comunicaAutomationInstance || typeof comunicaAutomationInstance.coletarIntimacoes !== 'function') {
                throw new Error("comunicaAutomationInstance não foi inicializado corretamente ou coletarIntimacoes não é uma função.");
            }
            const intimacoes = await comunicaAutomationInstance.coletarIntimacoes(
                advogado.oab,
                dataInicio,
                dataFim,
                advogado.tribunal || 'TJCE'
            );
            console.log("coletarIntimacoes call completed.");
            
            // Processar cada intimação
            for (const intimacao of intimacoes) {
                try {
                    await this.processarIntimacao(intimacao, advogado);
                } catch (error) {
                    console.error(`Erro ao processar intimação ${intimacao.numeroProcesso}:`, error);
                }
            }
            
            console.log(`Processadas ${intimacoes.length} intimações para ${advogado.oab}`);
            return intimacoes;
            
        } catch (error) {
            console.error(`Erro na coleta de intimações do advogado ${advogado.oab}:`, error);
            console.error("Detailed error in coletarIntimacoesAdvogado:", error);
            throw error;
        } finally {
            // 3. Garante que o navegador seja fechado após a coleta,
            //    independentemente de ter havido erro ou sucesso.
            if (comunicaAutomationInstance) {
                console.log("Closing ComunicaPJEAutomation browser.");
                await comunicaAutomationInstance.close();
                console.log("ComunicaPJEAutomation browser closed.");
            } else {
                console.log("ComunicaPJEAutomation instance was not created, nothing to close.");
            }
        }
    }

    async processarIntimacao(intimacao, advogado) {
        try {
            // Verificar se a intimação já existe no banco
            const intimacaoExistente = await this.buscarIntimacaoPorNumero(intimacao.numeroProcesso, advogado.id);

            if (intimacaoExistente) {
                // Verificar se precisa de reprocessamento baseado na qualidade dos dados
                const precisaReprocessar = this.verificarSeNecessitaReprocessamento(intimacaoExistente);

                if (!precisaReprocessar) {
                    console.log(`Intimação ${intimacao.numeroProcesso} já processada corretamente. Pulando.`);
                    return intimacaoExistente;
                }

                // Se precisa reprocessar, atualizar e enfileirar
                console.log(`Intimação ${intimacao.numeroProcesso} precisa ser reprocessada. Atualizando e enfileirando.`);

                const teorParaAtualizar = intimacao.teor;
                const statusParaAtualizar = (teorParaAtualizar && teorParaAtualizar !== 'N/A') ? 'pendente_processamento_nlp' : 'sem_teor';

                await pool.query(
                    `UPDATE intimacoes SET
                    teor = $1,
                    data_disponibilizacao = $2,
                    tribunal = $3,
                    caminho_arquivo = $4,
                    status = $5,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $6`,
                    [teorParaAtualizar, intimacao.dataDisponibilizacao, intimacao.tribunal, intimacao.urlCertidao, statusParaAtualizar, intimacaoExistente.id]
                );

                // Adiciona à fila de processamento
                if (statusParaAtualizar === 'pendente_processamento_nlp') {
                    this.adicionarFilaProcessamento({
                        intimacaoId: intimacaoExistente.id,
                        numeroProcesso: intimacao.numeroProcesso,
                        teor: teorParaAtualizar,
                        advogado: advogado
                    });
                }
                return intimacaoExistente;
            }

            // Resto da lógica para intimações novas...
        } catch (error) {
            console.error('Erro ao processar intimação:', error);
            throw error;
        }
    }

    // Novo método para verificar se uma intimação precisa de reprocessamento
    verificarSeNecessitaReprocessamento(intimacao) {
        // Se o status não é processado_nlp, definitivamente precisa reprocessar
        if (intimacao.status !== 'processado_nlp') {
            return true;
        }

        // Se o status é processado_nlp, verificar a qualidade dos dados
        const indicadoresDeErro = [
            'Erro ao gerar resumo',
            'Erro ao gerar parecer',
            'Erro ao gerar minuta',
            'Erro no processamento NLP',
            'Falha no processamento NLP'
        ];

        // Verificar se há indicadores de erro nos campos processados
        const temErroResumo = intimacao.resumo && indicadoresDeErro.some(erro => intimacao.resumo.includes(erro));
        const temErroParecer = intimacao.parecer && indicadoresDeErro.some(erro => intimacao.parecer.includes(erro));
        const temErroMinuta = intimacao.minuta_resposta && indicadoresDeErro.some(erro => intimacao.minuta_resposta.includes(erro));
        const temErroNotas = intimacao.notas_advogado && indicadoresDeErro.some(erro => intimacao.notas_advogado.includes(erro));

        // Se qualquer campo tem erro, precisa reprocessar
        if (temErroResumo || temErroParecer || temErroMinuta || temErroNotas) {
            return true;
        }

        // Verificar se campos essenciais estão vazios ou com valores padrão
        const resumoVazioOuPadrao = !intimacao.resumo || intimacao.resumo === 'Texto muito curto para gerar resumo.';
        const parecerVazioOuPadrao = !intimacao.parecer || intimacao.parecer === 'Não foi possível gerar um parecer.';
        const minutaVaziaOuPadrao = !intimacao.minuta_resposta || intimacao.minuta_resposta === 'Erro ao gerar minuta automática.';

        // Se campos essenciais estão vazios, precisa reprocessar
        if (resumoVazioOuPadrao || parecerVazioOuPadrao || minutaVaziaOuPadrao) {
            return true;
        }

        // Se chegou até aqui, a intimação está bem processada
        return false;
    }

    adicionarFilaProcessamento(item) {
        this.filaProcessamento.push(item);
        
        // Processar fila se não estiver processando
        if (!this.isProcessing) {
            this.processarFila();
        }
    }

    async processarFila() {
        if (this.isProcessing || this.filaProcessamento.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        
        try {
            while (this.filaProcessamento.length > 0) {
                const item = this.filaProcessamento.shift();
                
                try {
                    await this.processarItemFila(item);
                } catch (error) {
                    console.error('Erro ao processar item da fila:', error);
                }
                
                // Aguardar um pouco entre processamentos para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } finally {
            this.isProcessing = false;
        }
    }

    async processarItemFila(item) {
        try {
            console.log(`Processando item da fila com NLP: Intimação ID ${item.intimacaoId}, Processo ${item.numeroProcesso}`);
            
            // Chamar o serviço de NLP para processar o documento, passando o teor
            const resultadoNLP = await this.processadorNLP.processarIntimacaoCompleta(
                item.teor // Passando o teor diretamente
            );
            
            if (resultadoNLP) {
                // Atualizar intimação com dados do processamento NLP
                await this.atualizarIntimacaoComProcessamentoNLP(item.intimacaoId, resultadoNLP);
                console.log(`Intimação ${item.intimacaoId} processada com sucesso pelo NLP.`);
            } else {
                throw new Error("Resultado do processamento NLP vazio.");
            }
            
        } catch (error) {
            console.error(`Erro ao processar item da fila ${item.intimacaoId} com NLP:`, error);
            await this.marcarIntimacaoComoErro(item.intimacaoId, `Erro no processamento NLP: ${error.message}`);
        }
    }

    async coletarIntimacoesManual(advogadoId, dataInicio = null, dataFim = null) { 
        try {
            const advogado = await this.buscarAdvogadoPorId(advogadoId);
            if (!advogado) {
                throw new Error('Advogado não encontrado');
            }
            
            const intimacoes = await this.coletarIntimacoesAdvogado(advogado, dataInicio, dataFim);
            
            return {
                sucesso: true,
                quantidade: intimacoes.length,
                mensagem: `${intimacoes.length} intimações coletadas com sucesso`
            };
            
        } catch (error) {
            console.error('Erro na coleta manual:', error);
            return {
                sucesso: false,
                quantidade: 0,
                mensagem: `Erro na coleta: ${error.message}`
            };
        }
    }

    async obterStatusSincronizacao() {
        return {
            filaProcessamento: this.filaProcessamento.length,
            processandoAtualmente: this.isProcessing,
            ultimaColeta: await this.obterDataUltimaColeta(),
            proximaColeta: '10:00 (diário)'
        };
    }

    async buscarAdvogadosComCredenciais() {
        if (!this.credentialManager) {
            throw new Error('Serviço de criptografia não disponível.');
        }
        const res = await pool.query(
            `SELECT 
                u.id AS user_id,
                u.name AS user_name,
                ac.numero_oab,
                ac.usuario_pje,
                ac.senha_pje_encrypted,
                ac.tribunal
            FROM users u
            JOIN advogado_credenciais ac ON u.id = ac.user_id
            WHERE u.role = 'lawyer' AND ac.ativo = true`
        );
        return res.rows.map(row => {
            // Deserializa o JSON e descriptografa a senha
            const encryptedData = JSON.parse(row.senha_pje_encrypted);
            const decryptedPassword = this.credentialManager.decrypt(encryptedData);

            return {
                id: row.user_id,
                name: row.user_name,
                oab: row.numero_oab,
                usuarioPJE: row.usuario_pje,
                senhaPJE: decryptedPassword, // Senha já descriptografada
                tribunal: row.tribunal,
                isNovo: false // Lógica para identificar novos advogados pode ser adicionada aqui
            };
        });
    }

    async buscarAdvogadoPorId(id) {
        if (!this.credentialManager) {
            throw new Error('Serviço de criptografia não disponível.');
        }
        const res = await pool.query(
            `SELECT 
                u.id AS user_id,
                u.name AS user_name,
                ac.numero_oab,
                ac.usuario_pje,
                ac.senha_pje_encrypted,
                ac.tribunal
            FROM users u
            JOIN advogado_credenciais ac ON u.id = ac.user_id
            WHERE u.id = $1 AND u.role = 'lawyer' AND ac.ativo = true`,
            [id]
        );
        if (res.rows.length === 0) return null;
        const row = res.rows[0];

        // Deserializa o JSON e descriptografa a senha
        const encryptedData = JSON.parse(row.senha_pje_encrypted);
        const decryptedPassword = this.credentialManager.decrypt(encryptedData);

        return {
            id: row.user_id,
            name: row.user_name,
            oab: row.numero_oab,
            usuarioPJE: row.usuario_pje,
            senhaPJE: decryptedPassword, // Senha já descriptografada
            tribunal: row.tribunal,
            isNovo: false
        };
    }

    async buscarIntimacaoPorNumero(numeroProcesso, advogadoId) {
        const res = await pool.query(
            `SELECT * FROM intimacoes WHERE numero_processo = $1 AND advogado_id = $2`,
            [numeroProcesso, advogadoId]
        );
        return res.rows[0];
    }

    async salvarIntimacao(dadosIntimacao) {
        const { numeroProcesso, teor, dataDisponibilizacao, tribunal, advogadoId, caminhoArquivo, status } = dadosIntimacao;
        const res = await pool.query(
            `INSERT INTO intimacoes (
                numero_processo, teor, data_disponibilizacao, tribunal, advogado_id, caminho_arquivo, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [numeroProcesso, teor, dataDisponibilizacao, tribunal, advogadoId, caminhoArquivo, status]
        );
        return res.rows[0];
    }

    // NOVO MÉTODO: Atualizar intimação com os resultados do processamento NLP
    async atualizarIntimacaoComProcessamentoNLP(intimacaoId, resultadoNLP) {
        const {
            teor, resumo, entidades, prazos, tipo_documento,
            parecer, acoes_recomendadas, minuta_resposta,
            urgencia, complexidade
        } = resultadoNLP;

        try {
            // Converte objetos/listas para JSON strings para salvar no PostgreSQL
            const entidadesJson = JSON.stringify(entidades);
            const prazosJson = JSON.stringify(prazos);
            const acoesRecomendadasJson = JSON.stringify(acoes_recomendadas);

            const res = await pool.query(
                `UPDATE intimacoes SET
                    teor = $1,
                    resumo = $2,
                    entidades_json = $3,
                    prazos_json = $4,
                    tipo_documento = $5,
                    parecer = $6,
                    acoes_recomendadas_json = $7,
                    minuta_resposta = $8,
                    urgencia = $9,
                    complexidade = $10,
                    status = $11, -- Atualiza o status para indicar que o NLP foi processado
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $12 RETURNING *`,
                [
                    teor, resumo, entidadesJson, prazosJson, tipo_documento,
                    parecer, acoesRecomendadasJson, minuta_resposta,
                    urgencia, complexidade, 'processado_nlp', intimacaoId
                ]
            );
            return res.rows[0];
        } catch (error) {
            console.error(`Erro ao atualizar intimação ${intimacaoId} com dados de NLP:`, error);
            throw error;
        }
    }

    async marcarIntimacaoComoErro(intimacaoId, mensagemErro) {
        await pool.query(
            `UPDATE intimacoes SET status = 'erro_nlp', notas_advogado = $1 WHERE id = $2`,
            [mensagemErro, intimacaoId]
        );
    }

    // Este método não é mais chamado diretamente para processar,
    // a lógica de processamento agora está em processarItemFila.
    // Pode ser removido se não tiver outro propósito.
    async gerarResumoEParecer(intimacaoId) {
        console.log(`Gerando resumo e parecer para intimação ${intimacaoId}`);
    }

    // Este método (extrairTextoPDF) não é mais usado diretamente pelo JuridicoService,
    // pois o ProcessadorNLP agora lida com isso. Pode ser removido.
    async extrairTextoPDF(caminhoArquivo) {
        console.log(`Extraindo texto do PDF: ${caminhoArquivo}`);
        return "Texto extraído do PDF de exemplo."; // Retorno mock para teste
    }

    async obterDataUltimaColeta() {
        const res = await pool.query(
            `SELECT data_inicio FROM sincronizacao_historico ORDER BY data_inicio DESC LIMIT 1`
        );
        return res.rows.length > 0 ? res.rows[0].data_inicio : null;
    }

    async registrarSincronizacao(advogadoId, tipo, status, intimacoesColetadas, mensagem) {
        await pool.query(
            `INSERT INTO sincronizacao_historico (
                advogado_id, tipo_sincronizacao, status, intimacoes_coletadas, mensagem
            ) VALUES ($1, $2, $3, $4, $5)`,
            [advogadoId, tipo, status, intimacoesColetadas, mensagem]
        );
    }

    async configurarCredenciaisAdvogado(userId, credenciais) {
        if (!this.credentialManager) {
            throw new Error('Serviço de criptografia não disponível.');
        }

        const { numeroOAB, usuarioPJE, senhaPJE, tribunal } = credenciais;

        const encryptedPasswordData = this.credentialManager.encrypt(senhaPJE);
        const senhaCriptografadaJSON = JSON.stringify(encryptedPasswordData);

        const res = await pool.query(
            `INSERT INTO advogado_credenciais (
                user_id, numero_oab, usuario_pje, senha_pje_encrypted, tribunal
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id) DO UPDATE SET
                numero_oab = EXCLUDED.numero_oab,
                usuario_pje = EXCLUDED.usuario_pje,
                senha_pje_encrypted = EXCLUDED.senha_pje_encrypted,
                tribunal = EXCLUDED.tribunal,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *`,
            [userId, numeroOAB, usuarioPJE, senhaCriptografadaJSON, tribunal]
        );
        return res.rows[0];
    }

    // Métodos para buscar intimações e atualizar status (se existirem em seu código)
    async buscarIntimacoes(filtros, page, limit) {
        // Implementar lógica de busca com filtros e paginação
        console.log("Buscando intimações com filtros:", filtros);
        let query = `SELECT * FROM intimacoes WHERE advogado_id = $1`;
        const params = [filtros.advogadoId];
        let paramIndex = 2;

        if (filtros.numeroProcesso) {
            query += ` AND numero_processo ILIKE $${paramIndex++}`;
            params.push(`%${filtros.numeroProcesso}%`);
        }
        if (filtros.status) {
            query += ` AND status = $${paramIndex++}`;
            params.push(filtros.status);
        }
        // Adicione outros filtros conforme necessário (parte, advogado, dataInicio, dataFim)

        query += ` ORDER BY data_disponibilizacao DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, (page - 1) * limit);

        const res = await pool.query(query, params);
        return res.rows;
    }

    async buscarIntimacaoPorId(id) {
        const res = await pool.query('SELECT * FROM intimacoes WHERE id = $1', [id]);
        return res.rows[0];
    }

    async atualizarStatusIntimacao(id, status) {
        await pool.query('UPDATE intimacoes SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, id]);
    }

    async verificarPrazosUrgentes(advogadoId) {
        // Implementar lógica para verificar prazos urgentes
        console.log("Verificando prazos urgentes para advogado:", advogadoId);
        // Exemplo: buscar intimações com prazos próximos e status 'pendente_processamento_nlp' ou 'processado_nlp'
        const res = await pool.query(
            `SELECT * FROM intimacoes 
             WHERE advogado_id = $1 
             AND status IN ('pendente_processamento_nlp', 'processado_nlp') 
             AND prazos_json IS NOT NULL 
             ORDER BY data_disponibilizacao DESC`,
            [advogadoId]
        );
        
        const alertas = [];
        const hoje = new Date();
        for (const intimacao of res.rows) {
            try {
                const prazos = intimacao.prazos_json; // Já é um objeto JSONB
                for (const prazo of prazos) {
                    // Lógica para calcular a data final do prazo e comparar com hoje
                    // Isso é um exemplo, você precisará de uma lógica mais robusta para datas
                    const dataDisponibilizacao = new Date(intimacao.data_disponibilizacao);
                    const dataLimite = new Date(dataDisponibilizacao);
                    dataLimite.setDate(dataLimite.getDate() + prazo.dias); // Exemplo simples

                    if (dataLimite > hoje && (dataLimite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24) <= 5) { // Prazo em 5 dias
                        alertas.push({
                            intimacaoId: intimacao.id,
                            numeroProcesso: intimacao.numero_processo,
                            prazo: prazo.dias,
                            dataLimite: dataLimite.toISOString().split('T')[0],
                            mensagem: `Prazo de ${prazo.dias} dias se encerrando para o processo ${intimacao.numero_processo}.`
                        });
                    }
                }
            } catch (e) {
                console.error(`Erro ao processar prazos para intimação ${intimacao.id}:`, e);
            }
        }
        return alertas;
    }

    async gerarPDFParecer(intimacao) {
        // Implementar geração de PDF do parecer
        console.log("Gerando PDF do parecer para intimação:", intimacao.id);
        // Isso pode envolver uma biblioteca de PDF no Node.js ou chamar um serviço externo
        return null; // Retorno mock
    }

    async gerarPDFMinuta(intimacao) {
        // Implementar geração de PDF da minuta
        console.log("Gerando PDF da minuta para intimação:", intimacao.id);
        return null; // Retorno mock
    }

    async atualizarNotasIntimacao(id, notas) {
        await pool.query('UPDATE intimacoes SET notas_advogado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [notas, id]);
    }

    async buscarIntimacoesAdvogado(advogadoId) {
        // Retorna todas as intimações processadas para um advogado para fins de similaridade
        const res = await pool.query(
            `SELECT id, teor, numero_processo FROM intimacoes 
             WHERE advogado_id = $1 AND status = 'processado_nlp' AND teor IS NOT NULL`,
            [advogadoId]
        );
        return res.rows;
    }

    async atualizarIntimacaoComProcessamento(id, resultadoProcessamento) {
        // Este método é chamado pelo endpoint /reprocessar/:id
        // Ele deve chamar atualizarIntimacaoComProcessamentoNLP
        return this.atualizarIntimacaoComProcessamentoNLP(id, resultadoProcessamento);
    }

    async obterEstatisticas(advogadoId) {
        // Implementar lógica para obter estatísticas
        console.log("Obtendo estatísticas para advogado:", advogadoId);
        const totalIntimacoes = await pool.query('SELECT COUNT(*) FROM intimacoes WHERE advogado_id = $1', [advogadoId]);
        const intimacoesProcessadas = await pool.query('SELECT COUNT(*) FROM intimacoes WHERE advogado_id = $1 AND status = $2', [advogadoId, 'processado_nlp']);
        const intimacoesPendentes = await pool.query('SELECT COUNT(*) FROM intimacoes WHERE advogado_id = $1 AND status = $2', [advogadoId, 'pendente_processamento_nlp']);
        const intimacoesComErro = await pool.query('SELECT COUNT(*) FROM intimacoes WHERE advogado_id = $1 AND status = $2', [advogadoId, 'erro_nlp']);

        return {
            total: parseInt(totalIntimacoes.rows[0].count),
            processadas: parseInt(intimacoesProcessadas.rows[0].count),
            pendentes: parseInt(intimacoesPendentes.rows[0].count),
            comErro: parseInt(intimacoesComErro.rows[0].count)
        };
    }
}

module.exports = JuridicoService;

function limparTextoParaEnvio(texto) {
    if (!texto) return '';
    // Remove caracteres de controle (0x00-0x1F, 0x7F-0x9F)
    let cleanedText = texto.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    // Remove line/paragraph separators (U+2028, U+2029) que podem quebrar JSON
    cleanedText = cleanedText.replace(/\u2028|\u2029/g, '');
    // Normaliza múltiplos espaços para um único espaço e remove espaços no início/fim
    cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
    return cleanedText;
}
