const Joi = require('joi');

// Schema de validação para clientes
const clienteSchema = Joi.object({
    name: Joi.string().min(2).max(255).required().messages({
        'string.base': 'Nome deve ser uma string',
        'string.empty': 'Nome é obrigatório',
        'string.min': 'Nome deve ter pelo menos 2 caracteres',
        'string.max': 'Nome deve ter no máximo 255 caracteres',
        'any.required': 'Nome é obrigatório'
    }),
    email: Joi.string().email().optional().messages({
        'string.email': 'Email deve ter um formato válido'
    }),
    phone: Joi.string().pattern(/^\(\d{2}\)\s\d{4,5}-\d{4}$/).optional().messages({
        'string.pattern.base': 'Telefone deve estar no formato (XX) XXXXX-XXXX'
    }),
    cpf_cnpj: Joi.string().pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/).optional().messages({
        'string.pattern.base': 'CPF deve estar no formato XXX.XXX.XXX-XX ou CNPJ no formato XX.XXX.XXX/XXXX-XX'
    }),
    address: Joi.string().max(500).optional().messages({
        'string.max': 'Endereço deve ter no máximo 500 caracteres'
    }),
    city: Joi.string().max(100).optional().messages({
        'string.max': 'Cidade deve ter no máximo 100 caracteres'
    }),
    state: Joi.string().length(2).optional().messages({
        'string.length': 'Estado deve ter exatamente 2 caracteres'
    }),
    zip_code: Joi.string().pattern(/^\d{5}-\d{3}$/).optional().messages({
        'string.pattern.base': 'CEP deve estar no formato XXXXX-XXX'
    }),
    notes: Joi.string().max(2000).optional().messages({
        'string.max': 'Observações devem ter no máximo 2000 caracteres'
    })
});

// Schema de validação para processos jurídicos
const processoSchema = Joi.object({
    numero_processo: Joi.string().pattern(/^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/).required().messages({
        'string.pattern.base': 'Número do processo deve estar no formato XXXXXXX-XX.XXXX.X.XX.XXXX',
        'any.required': 'Número do processo é obrigatório'
    }),
    cliente_id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID do cliente deve ser um número',
        'number.integer': 'ID do cliente deve ser um número inteiro',
        'number.positive': 'ID do cliente deve ser positivo',
        'any.required': 'ID do cliente é obrigatório'
    }),
    advogado_id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID do advogado deve ser um número',
        'number.integer': 'ID do advogado deve ser um número inteiro',
        'number.positive': 'ID do advogado deve ser positivo',
        'any.required': 'ID do advogado é obrigatório'
    }),
    tipo_acao: Joi.string().max(100).required().messages({
        'string.max': 'Tipo de ação deve ter no máximo 100 caracteres',
        'any.required': 'Tipo de ação é obrigatório'
    }),
    status: Joi.string().valid('ativo', 'arquivado', 'suspenso', 'finalizado').default('ativo').messages({
        'any.only': 'Status deve ser: ativo, arquivado, suspenso ou finalizado'
    }),
    valor_causa: Joi.number().precision(2).min(0).optional().messages({
        'number.base': 'Valor da causa deve ser um número',
        'number.precision': 'Valor da causa deve ter no máximo 2 casas decimais',
        'number.min': 'Valor da causa deve ser positivo'
    }),
    data_distribuicao: Joi.date().iso().optional().messages({
        'date.format': 'Data de distribuição deve estar no formato ISO (YYYY-MM-DD)'
    }),
    observacoes: Joi.string().max(2000).optional().messages({
        'string.max': 'Observações devem ter no máximo 2000 caracteres'
    })
});

// Schema de validação para intimações
const intimacaoSchema = Joi.object({
    processo_id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID do processo deve ser um número',
        'number.integer': 'ID do processo deve ser um número inteiro',
        'number.positive': 'ID do processo deve ser positivo',
        'any.required': 'ID do processo é obrigatório'
    }),
    teor: Joi.string().min(10).max(50000).required().messages({
        'string.min': 'Teor da intimação deve ter pelo menos 10 caracteres',
        'string.max': 'Teor da intimação deve ter no máximo 50000 caracteres',
        'any.required': 'Teor da intimação é obrigatório'
    }),
    data_intimacao: Joi.date().iso().required().messages({
        'date.format': 'Data da intimação deve estar no formato ISO (YYYY-MM-DD)',
        'any.required': 'Data da intimação é obrigatória'
    }),
    prazo_dias: Joi.number().integer().min(0).max(365).optional().messages({
        'number.base': 'Prazo deve ser um número',
        'number.integer': 'Prazo deve ser um número inteiro',
        'number.min': 'Prazo deve ser positivo',
        'number.max': 'Prazo deve ser no máximo 365 dias'
    }),
    status: Joi.string().valid('pendente', 'cumprida', 'vencida').default('pendente').messages({
        'any.only': 'Status deve ser: pendente, cumprida ou vencida'
    }),
    observacoes: Joi.string().max(1000).optional().messages({
        'string.max': 'Observações devem ter no máximo 1000 caracteres'
    })
});

// Schema de validação para documentos
const documentoSchema = Joi.object({
    processo_id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID do processo deve ser um número',
        'number.integer': 'ID do processo deve ser um número inteiro',
        'number.positive': 'ID do processo deve ser positivo',
        'any.required': 'ID do processo é obrigatório'
    }),
    nome: Joi.string().min(1).max(255).required().messages({
        'string.min': 'Nome do documento é obrigatório',
        'string.max': 'Nome do documento deve ter no máximo 255 caracteres',
        'any.required': 'Nome do documento é obrigatório'
    }),
    tipo: Joi.string().valid(
        'petição inicial', 'despacho', 'intimação', 'parecer mp', 
        'contestação', 'decisão', 'sentença', 'mandado', 'documento genérico'
    ).required().messages({
        'any.only': 'Tipo deve ser um dos tipos válidos de documento jurídico',
        'any.required': 'Tipo do documento é obrigatório'
    }),
    conteudo: Joi.string().min(10).max(100000).optional().messages({
        'string.min': 'Conteúdo deve ter pelo menos 10 caracteres',
        'string.max': 'Conteúdo deve ter no máximo 100000 caracteres'
    }),
    caminho_arquivo: Joi.string().max(500).optional().messages({
        'string.max': 'Caminho do arquivo deve ter no máximo 500 caracteres'
    })
});

// Schema de validação para usuários/advogados
const usuarioSchema = Joi.object({
    nome: Joi.string().min(2).max(255).required().messages({
        'string.min': 'Nome deve ter pelo menos 2 caracteres',
        'string.max': 'Nome deve ter no máximo 255 caracteres',
        'any.required': 'Nome é obrigatório'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Email deve ter um formato válido',
        'any.required': 'Email é obrigatório'
    }),
    senha: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required().messages({
        'string.min': 'Senha deve ter pelo menos 8 caracteres',
        'string.pattern.base': 'Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial',
        'any.required': 'Senha é obrigatória'
    }),
    oab: Joi.string().pattern(/^\d{4,6}$/).required().messages({
        'string.pattern.base': 'OAB deve conter apenas números (4-6 dígitos)',
        'any.required': 'Número da OAB é obrigatório'
    }),
    telefone: Joi.string().pattern(/^\(\d{2}\)\s\d{4,5}-\d{4}$/).optional().messages({
        'string.pattern.base': 'Telefone deve estar no formato (XX) XXXXX-XXXX'
    })
});

// Middleware de validação genérico
const validationMiddleware = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false, // Retorna todos os erros, não apenas o primeiro
            stripUnknown: true // Remove campos não definidos no schema
        });

        if (error) {
            const detalhes = error.details.map(detail => ({
                campo: detail.path.join('.'),
                mensagem: detail.message,
                valor_recebido: detail.context.value
            }));

            return res.status(400).json({
                erro: 'Dados inválidos',
                detalhes: detalhes
            });
        }

        // Substitui req.body pelos dados validados e sanitizados
        req.body = value;
        next();
    };
};

// Middleware de validação para parâmetros de query
const queryValidationMiddleware = (schema) => {
    return (req, res, next) => {
        // Etapa 1: Limpeza - converter strings vazias para undefined
        const cleanQuery = {};
        for (const [key, value] of Object.entries(req.query)) {
            if (value === '' || value === null) {
                cleanQuery[key] = undefined;
            } else {
                cleanQuery[key] = value;
            }
        }

        // Etapa 2: Validação e aplicação de padrões
        const { error, value } = schema.validate(cleanQuery, {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: false
        });

        if (error) {
            return res.status(400).json({
                erro: 'Parâmetros de consulta inválidos',
                detalhes: error.details.map(detail => ({
                    parametro: detail.path.join('.'),
                    mensagem: detail.message,
                    valor_recebido: detail.context.value
                }))
            });
        }

        req.query = value;
        next();
    };
};

// Schema para validação de parâmetros de busca
const buscaSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
        'number.base': 'Página deve ser um número',
        'number.integer': 'Página deve ser um número inteiro',
        'number.min': 'Página deve ser maior que 0'
    }),
    limit: Joi.number().integer().min(1).max(100).default(50).messages({
        'number.base': 'Limite deve ser um número',
        'number.integer': 'Limite deve ser um número inteiro',
        'number.min': 'Limite deve ser maior que 0',
        'number.max': 'Limite deve ser no máximo 100'
    }),
    search: Joi.string().max(255).optional().messages({
        'string.max': 'Termo de busca deve ter no máximo 255 caracteres'
    }),
    status: Joi.string().optional(),
    data_inicio: Joi.date().iso().optional().messages({
        'date.format': 'Data de início deve estar no formato ISO (YYYY-MM-DD)'
    }),
    data_fim: Joi.date().iso().optional().messages({
        'date.format': 'Data de fim deve estar no formato ISO (YYYY-MM-DD)'
    })
});

// Middleware para sanitização de entrada (prevenção de XSS)
const sanitizeInput = (req, res, next) => {
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        
        // Remove scripts e tags HTML perigosas
        return str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
    };

    const sanitizeObject = (obj) => {
        if (obj === null || typeof obj !== 'object') return obj;
        
        if (Array.isArray(obj)) {
            return obj.map(sanitizeObject);
        }
        
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                sanitized[key] = sanitizeString(value);
            } else if (typeof value === 'object') {
                sanitized[key] = sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    };

    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    next();
};

// Schema de validação para cliente (Fase 1)
const clienteNovoSchema = Joi.object({
    nome_completo: Joi.string().min(2).max(255).required().messages({
        'string.base': 'Nome completo deve ser uma string',
        'string.empty': 'Nome completo é obrigatório',
        'string.min': 'Nome completo deve ter pelo menos 2 caracteres',
        'string.max': 'Nome completo deve ter no máximo 255 caracteres',
        'any.required': 'Nome completo é obrigatório'
    }),
    email: Joi.string().email().optional().allow('').messages({
        'string.email': 'Email deve ter um formato válido'
    }),
    telefone: Joi.string().optional().allow('').messages({
        'string.base': 'Telefone deve ser uma string'
    }),
    cpf_cnpj: Joi.string().optional().allow('').messages({
        'string.base': 'CPF/CNPJ deve ser uma string'
    }),
    endereco: Joi.string().max(500).optional().allow('').messages({
        'string.max': 'Endereço deve ter no máximo 500 caracteres'
    }),
    cidade: Joi.string().max(100).optional().allow('').messages({
        'string.max': 'Cidade deve ter no máximo 100 caracteres'
    }),
    estado: Joi.string().max(50).optional().allow('').messages({
        'string.max': 'Estado deve ter no máximo 50 caracteres'
    }),
    cep: Joi.string().optional().allow('').messages({
        'string.base': 'CEP deve ser uma string'
    }),
    notas: Joi.string().max(2000).optional().allow('').messages({
        'string.max': 'Notas devem ter no máximo 2000 caracteres'
    }),
    user_id: Joi.number().integer().positive().optional().messages({
        'number.base': 'ID do usuário deve ser um número',
        'number.integer': 'ID do usuário deve ser um número inteiro',
        'number.positive': 'ID do usuário deve ser positivo'
    })
});

// Schema de validação para processo (Fase 1)
const processoNovoSchema = Joi.object({
    numero_processo: Joi.string().required().messages({
        'string.empty': 'Número do processo é obrigatório',
        'any.required': 'Número do processo é obrigatório'
    }),
    advogado_id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID do advogado deve ser um número',
        'number.integer': 'ID do advogado deve ser um número inteiro',
        'number.positive': 'ID do advogado deve ser positivo',
        'any.required': 'ID do advogado é obrigatório'
    }),
    tribunal: Joi.string().max(50).optional().default('TJCE').messages({
        'string.max': 'Tribunal deve ter no máximo 50 caracteres'
    }),
    tipo_acao: Joi.string().max(100).optional().allow('').messages({
        'string.max': 'Tipo de ação deve ter no máximo 100 caracteres'
    }),
    valor_causa: Joi.number().precision(2).positive().optional().messages({
        'number.base': 'Valor da causa deve ser um número',
        'number.positive': 'Valor da causa deve ser positivo'
    }),
    observacoes: Joi.string().max(2000).optional().allow('').messages({
        'string.max': 'Observações devem ter no máximo 2000 caracteres'
    })
});

// Schema de validação para atividade
const atividadeSchema = Joi.object({
    intimacao_id: Joi.number().integer().positive().optional().messages({
        'number.base': 'ID da intimação deve ser um número',
        'number.integer': 'ID da intimação deve ser um número inteiro',
        'number.positive': 'ID da intimação deve ser positivo'
    }),
    processo_id: Joi.number().integer().positive().optional().messages({
        'number.base': 'ID do processo deve ser um número',
        'number.integer': 'ID do processo deve ser um número inteiro',
        'number.positive': 'ID do processo deve ser positivo'
    }),
    assigned_to_user_id: Joi.number().integer().positive().optional().messages({
        'number.base': 'ID do usuário atribuído deve ser um número',
        'number.integer': 'ID do usuário atribuído deve ser um número inteiro',
        'number.positive': 'ID do usuário atribuído deve ser positivo'
    }),
    type: Joi.string().valid(
        'parecer_gerado', 'minuta_gerada', 'status_atualizado', 
        'nota_adicionada', 'acao_recomendada', 'intimacao_recebida',
        'atividade_externa', 'delegacao'
    ).required().messages({
        'any.only': 'Tipo de atividade inválido',
        'any.required': 'Tipo de atividade é obrigatório'
    }),
    description: Joi.string().min(1).max(1000).required().messages({
        'string.empty': 'Descrição é obrigatória',
        'string.min': 'Descrição deve ter pelo menos 1 caractere',
        'string.max': 'Descrição deve ter no máximo 1000 caracteres',
        'any.required': 'Descrição é obrigatória'
    }),
    details_json: Joi.object().optional().messages({
        'object.base': 'Detalhes devem ser um objeto JSON válido'
    }),
    visible_to_client: Joi.boolean().optional().default(false).messages({
        'boolean.base': 'Visibilidade para cliente deve ser verdadeiro ou falso'
    })
});

// Schema para vincular cliente ao processo
const vinculoClienteProcessoSchema = Joi.object({
    processo_id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID do processo deve ser um número',
        'number.integer': 'ID do processo deve ser um número inteiro',
        'number.positive': 'ID do processo deve ser positivo',
        'any.required': 'ID do processo é obrigatório'
    }),
    client_id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID do cliente deve ser um número',
        'number.integer': 'ID do cliente deve ser um número inteiro',
        'number.positive': 'ID do cliente deve ser positivo',
        'any.required': 'ID do cliente é obrigatório'
    }),
    tipo_participacao: Joi.string().valid('requerente', 'requerido', 'terceiro').optional().default('requerente').messages({
        'any.only': 'Tipo de participação deve ser: requerente, requerido ou terceiro'
    })
});

// Schema para notas do advogado
const notasAdvogadoSchema = Joi.object({
    notas_advogado: Joi.string().max(5000).required().messages({
        'string.empty': 'Notas do advogado são obrigatórias',
        'string.max': 'Notas do advogado devem ter no máximo 5000 caracteres',
        'any.required': 'Notas do advogado são obrigatórias'
    })
});

module.exports = {
    clienteSchema,
    processoSchema,
    intimacaoSchema,
    documentoSchema,
    usuarioSchema,
    buscaSchema,
    clienteNovoSchema,
    processoNovoSchema,
    atividadeSchema,
    vinculoClienteProcessoSchema,
    notasAdvogadoSchema,
    validationMiddleware,
    queryValidationMiddleware,
    sanitizeInput
};


