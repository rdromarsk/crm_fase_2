-- Extensão do schema para o módulo jurídico

-- Tabela para armazenar credenciais dos advogados para acesso aos portais
CREATE TABLE IF NOT EXISTS advogado_credenciais (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    numero_oab VARCHAR(50) NOT NULL,
    usuario_pje VARCHAR(100) NOT NULL,
    senha_pje_encrypted TEXT NOT NULL,
    tribunal VARCHAR(50) DEFAULT 'TJCE',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar intimações
CREATE TABLE IF NOT EXISTS intimacoes (
    id SERIAL PRIMARY KEY,
    advogado_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    numero_processo VARCHAR(50) NOT NULL,
    teor TEXT,
    resumo TEXT,
    data_disponibilizacao DATE,
    tribunal VARCHAR(50) DEFAULT 'TJCE',
    caminho_arquivo TEXT,
    status VARCHAR(20) DEFAULT 'pendente',
    urgencia VARCHAR(10) DEFAULT 'normal',
    complexidade VARCHAR(10) DEFAULT 'media',
    sentimento VARCHAR(10) DEFAULT 'neutro',
    tipo_intimacao VARCHAR(50),
    parecer TEXT,
    minuta_resposta TEXT,
    notas_advogado TEXT,
    processado BOOLEAN DEFAULT false,
    data_processamento TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar prazos identificados nas intimações
CREATE TABLE IF NOT EXISTS intimacao_prazos (
    id SERIAL PRIMARY KEY,
    intimacao_id INTEGER REFERENCES intimacoes(id) ON DELETE CASCADE,
    dias INTEGER NOT NULL,
    contexto TEXT,
    data_vencimento DATE,
    cumprido BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar entidades extraídas das intimações
CREATE TABLE IF NOT EXISTS intimacao_entidades (
    id SERIAL PRIMARY KEY,
    intimacao_id INTEGER REFERENCES intimacoes(id) ON DELETE CASCADE,
    tipo_entidade VARCHAR(50) NOT NULL,
    valor TEXT NOT NULL,
    posicao INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar documentos do processo
CREATE TABLE IF NOT EXISTS processo_documentos (
    id SERIAL PRIMARY KEY,
    intimacao_id INTEGER REFERENCES intimacoes(id) ON DELETE CASCADE,
    numero_processo VARCHAR(50) NOT NULL,
    tipo_documento VARCHAR(50) NOT NULL,
    descricao TEXT,
    caminho_arquivo TEXT,
    url_origem TEXT,
    data_documento DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar ações recomendadas
CREATE TABLE IF NOT EXISTS intimacao_acoes (
    id SERIAL PRIMARY KEY,
    intimacao_id INTEGER REFERENCES intimacoes(id) ON DELETE CASCADE,
    acao TEXT NOT NULL,
    prioridade VARCHAR(10) DEFAULT 'normal',
    cumprida BOOLEAN DEFAULT false,
    data_cumprimento TIMESTAMP,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar histórico de sincronização
CREATE TABLE IF NOT EXISTS sincronizacao_historico (
    id SERIAL PRIMARY KEY,
    advogado_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tipo_sincronizacao VARCHAR(20) NOT NULL, -- 'automatica' ou 'manual'
    status VARCHAR(20) NOT NULL, -- 'sucesso', 'erro', 'em_andamento'
    intimacoes_coletadas INTEGER DEFAULT 0,
    mensagem TEXT,
    data_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMP
);

-- Tabela para armazenar processos similares identificados
CREATE TABLE IF NOT EXISTS processos_similares (
    id SERIAL PRIMARY KEY,
    intimacao_origem_id INTEGER REFERENCES intimacoes(id) ON DELETE CASCADE,
    intimacao_similar_id INTEGER REFERENCES intimacoes(id) ON DELETE CASCADE,
    similaridade DECIMAL(3,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar análise semântica
CREATE TABLE IF NOT EXISTS intimacao_analise_semantica (
    id SERIAL PRIMARY KEY,
    intimacao_id INTEGER REFERENCES intimacoes(id) ON DELETE CASCADE,
    topicos JSONB,
    palavras_chave JSONB,
    classificacao_automatica VARCHAR(100),
    confianca_classificacao DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_intimacoes_advogado_id ON intimacoes(advogado_id);
CREATE INDEX IF NOT EXISTS idx_intimacoes_numero_processo ON intimacoes(numero_processo);
CREATE INDEX IF NOT EXISTS idx_intimacoes_status ON intimacoes(status);
CREATE INDEX IF NOT EXISTS idx_intimacoes_data_disponibilizacao ON intimacoes(data_disponibilizacao);
CREATE INDEX IF NOT EXISTS idx_intimacao_prazos_intimacao_id ON intimacao_prazos(intimacao_id);
CREATE INDEX IF NOT EXISTS idx_intimacao_prazos_data_vencimento ON intimacao_prazos(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_processo_documentos_numero_processo ON processo_documentos(numero_processo);
CREATE INDEX IF NOT EXISTS idx_sincronizacao_historico_advogado_id ON sincronizacao_historico(advogado_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_intimacoes_updated_at BEFORE UPDATE ON intimacoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advogado_credenciais_updated_at BEFORE UPDATE ON advogado_credenciais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de teste para os dois advogados
INSERT INTO advogado_credenciais (user_id, numero_oab, usuario_pje, senha_pje_encrypted, tribunal)
SELECT 
    u.id,
    CASE 
        WHEN u.name = 'Allisson' THEN '41134'
        WHEN u.name = 'Ticiana' THEN '21817'
        ELSE '00000'
    END,
    CASE 
        WHEN u.name = 'Allisson' THEN '01480122300'
        WHEN u.name = 'Ticiana' THEN '94054312349'
        ELSE 'usuario_teste'
    END,
    CASE 
        WHEN u.name = 'Allisson' THEN 'Habibsss42&'
        WHEN u.name = 'Ticiana' THEN 'tsaa16121128'
        ELSE 'senha_teste'
    END,
    'TJCE'
FROM users u
WHERE u.name IN ('Allisson', 'Ticiana')
ON CONFLICT DO NOTHING;


