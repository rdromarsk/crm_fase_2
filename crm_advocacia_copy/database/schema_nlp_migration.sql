-- Para que o atualizarIntimacaoComProcessamentoNLP funcione corretamente, você precisará adicionar as novas colunas à sua tabela intimacoes no PostgreSQL.

ALTER TABLE intimacoes
ADD COLUMN IF NOT EXISTS teor TEXT,
ADD COLUMN IF NOT EXISTS resumo TEXT,
ADD COLUMN IF NOT EXISTS entidades_json JSONB,
ADD COLUMN IF NOT EXISTS prazos_json JSONB,
ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(50),
ADD COLUMN IF NOT EXISTS parecer TEXT,
ADD COLUMN IF NOT EXISTS acoes_recomendadas_json JSONB,
ADD COLUMN IF NOT EXISTS minuta_resposta TEXT,
ADD COLUMN IF NOT EXISTS urgencia VARCHAR(20),
ADD COLUMN IF NOT EXISTS complexidade VARCHAR(20),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pendente';
