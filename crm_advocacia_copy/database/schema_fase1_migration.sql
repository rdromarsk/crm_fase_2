-- Migração para Fase 1: Modelo de Cliente e Relacionamentos

-- 1. Atualizar tabela de clientes para incluir campos necessários
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nome_completo VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cidade VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS estado VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cep VARCHAR(10);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- Migrar dados existentes se necessário
UPDATE clients SET nome_completo = name WHERE nome_completo IS NULL;

-- 2. Criar tabela de processos (se não existir)
CREATE TABLE IF NOT EXISTS processos (
    id SERIAL PRIMARY KEY,
    numero_processo VARCHAR(50) UNIQUE NOT NULL,
    advogado_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tribunal VARCHAR(50) DEFAULT 'TJCE',
    tipo_acao VARCHAR(100),
    valor_causa DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'ativo',
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Criar tabela de relacionamento processo-clientes (muitos para muitos)
CREATE TABLE IF NOT EXISTS processo_clientes (
    id SERIAL PRIMARY KEY,
    processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    tipo_participacao VARCHAR(50) DEFAULT 'requerente', -- 'requerente', 'requerido', 'terceiro'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(processo_id, client_id)
);

-- 4. Adicionar processo_id na tabela intimacoes
ALTER TABLE intimacoes ADD COLUMN IF NOT EXISTS processo_id INTEGER REFERENCES processos(id);

-- 5. Criar tabela de atividades para histórico/mural
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    intimacao_id INTEGER REFERENCES intimacoes(id) ON DELETE CASCADE,
    processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- 'parecer_gerado', 'status_atualizado', 'nota_adicionada', etc.
    description TEXT NOT NULL,
    details_json JSONB,
    visible_to_client BOOLEAN DEFAULT false,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Atualizar sistema de roles
-- Adicionar role 'assistant' se não existir
INSERT INTO roles (name, description, permissions) 
VALUES ('assistant', 'Assistente de Advogado', '{"clients": true, "cases": true, "juridico": {"view": true, "update_status": true, "add_notes": true}, "documents": {"view": true}}')
ON CONFLICT (name) DO NOTHING;

-- 7. Criar tabela de relacionamento processo-usuários (múltiplos advogados/assistentes por caso)
CREATE TABLE IF NOT EXISTS processo_users (
    id SERIAL PRIMARY KEY,
    processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_in_process VARCHAR(50) DEFAULT 'colaborador', -- 'responsavel', 'colaborador'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(processo_id, user_id)
);

-- 8. Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_processos_numero_processo ON processos(numero_processo);
CREATE INDEX IF NOT EXISTS idx_processos_advogado_id ON processos(advogado_id);
CREATE INDEX IF NOT EXISTS idx_processo_clientes_processo_id ON processo_clientes(processo_id);
CREATE INDEX IF NOT EXISTS idx_processo_clientes_client_id ON processo_clientes(client_id);
CREATE INDEX IF NOT EXISTS idx_intimacoes_processo_id ON intimacoes(processo_id);
CREATE INDEX IF NOT EXISTS idx_activities_intimacao_id ON activities(intimacao_id);
CREATE INDEX IF NOT EXISTS idx_activities_processo_id ON activities(processo_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_assigned_to_user_id ON activities(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_processo_users_processo_id ON processo_users(processo_id);
CREATE INDEX IF NOT EXISTS idx_processo_users_user_id ON processo_users(user_id);

-- 9. Triggers para atualizar updated_at
CREATE TRIGGER update_processos_updated_at BEFORE UPDATE ON processos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Função para criar processo automaticamente quando uma intimação é recebida
CREATE OR REPLACE FUNCTION create_processo_if_not_exists()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se já existe um processo para este número
    IF NOT EXISTS (SELECT 1 FROM processos WHERE numero_processo = NEW.numero_processo) THEN
        -- Criar novo processo
        INSERT INTO processos (numero_processo, advogado_id, tribunal)
        VALUES (NEW.numero_processo, NEW.advogado_id, NEW.tribunal);
    END IF;
    
    -- Atualizar o processo_id na intimação
    NEW.processo_id = (SELECT id FROM processos WHERE numero_processo = NEW.numero_processo LIMIT 1);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para criação automática de processo
DROP TRIGGER IF EXISTS trigger_create_processo_on_intimacao ON intimacoes;
CREATE TRIGGER trigger_create_processo_on_intimacao
    BEFORE INSERT ON intimacoes
    FOR EACH ROW EXECUTE FUNCTION create_processo_if_not_exists();

-- 11. Migrar intimações existentes para criar processos
INSERT INTO processos (numero_processo, advogado_id, tribunal)
SELECT DISTINCT numero_processo, advogado_id, tribunal
FROM intimacoes
WHERE numero_processo NOT IN (SELECT numero_processo FROM processos)
ON CONFLICT (numero_processo) DO NOTHING;

-- Atualizar processo_id nas intimações existentes
UPDATE intimacoes 
SET processo_id = p.id
FROM processos p
WHERE intimacoes.numero_processo = p.numero_processo
AND intimacoes.processo_id IS NULL;