# Sistema CRM para Escritórios de Advocacia - Manual de Instalação

**Versão:** 3.0  
**Data:** 26 de junho de 2025  
**Autor:** Manus AI  

---

## Pré-requisitos

### Sistema Operacional

A versão 3.0 foi otimizada para melhor compatibilidade e performance em diferentes sistemas operacionais. O sistema suporta Ubuntu 20.04+ (recomendado para produção), Windows 10/11 (para desenvolvimento e pequenas instalações) e macOS 11+ (para desenvolvimento). Para instalações de produção, recomenda-se Ubuntu Server 22.04 LTS para máxima estabilidade e suporte de longo prazo.

Os requisitos de hardware foram atualizados para refletir as melhorias de performance da versão 3.0. Mínimo de 8GB RAM (anteriormente 4GB) devido às melhorias em processamento de IA, recomendado 16GB para instalações com alto volume de documentos. Mínimo de 100GB espaço em disco (anteriormente 50GB) para acomodar logs detalhados e cache de documentos, recomendado 500GB para instalações de produção.

Para processamento de IA otimizado, recomenda-se CPU com pelo menos 4 cores físicos (8 threads), preferencialmente Intel i7 ou AMD Ryzen 7 ou superior. Para instalações de alto volume, considere GPUs compatíveis com CUDA para aceleração de processamento de linguagem natural.

### Software Necessário

A versão 3.0 requer versões atualizadas de todas as dependências para garantir compatibilidade com as novas funcionalidades de segurança e performance. Node.js 18+ (recomendado 20+) para suporte completo às funcionalidades de validação Joi e APIs modernas. Python 3.9+ (recomendado 3.11+) para compatibilidade com bibliotecas de IA mais recentes.

PostgreSQL 13+ (recomendado 15+) para suporte a funcionalidades avançadas de indexação e performance. Git para controle de versão e deployment automatizado. Docker e Docker Compose (opcional, mas recomendado) para deployment containerizado e isolamento de ambiente.

Dependências adicionais incluem Redis (opcional, para cache avançado), Nginx (recomendado para proxy reverso e SSL termination) e Certbot (para certificados SSL automáticos). Para ambientes de desenvolvimento, recomenda-se VS Code ou WebStorm com extensões apropriadas.

## Instalação Passo a Passo

### 1. Preparação do Ambiente

A preparação do ambiente foi simplificada na versão 3.0 com scripts automatizados que configuram todas as dependências necessárias. Para Ubuntu/Debian, execute os seguintes comandos para atualização do sistema e instalação de dependências básicas:

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências do sistema
sudo apt install -y curl wget git build-essential python3-dev postgresql-server-dev-all

# Instalar Node.js 20 (versão LTS recomendada)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalação
node --version  # deve mostrar v20.x.x
npm --version   # deve mostrar 10.x.x ou superior
```

Para Python e dependências de IA:

```bash
# Instalar Python e pip
sudo apt install -y python3 python3-pip python3-venv

# Instalar dependências para processamento de PDF e IA
sudo apt install -y tesseract-ocr tesseract-ocr-por poppler-utils

# Verificar instalação
python3 --version  # deve mostrar 3.9+ 
pip3 --version     # deve mostrar versão recente
```

### 2. Configuração do Banco de Dados

A configuração do banco de dados foi aprimorada com scripts automatizados e configurações otimizadas para a versão 3.0. Instale e configure PostgreSQL:

```bash
# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Iniciar e habilitar PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configurar usuário postgres
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'sua_senha_segura';"
```

Crie o banco de dados e usuário da aplicação:

```bash
# Conectar como postgres
sudo -u postgres psql

-- Criar banco de dados
CREATE DATABASE crm_advocacia;

-- Criar usuário da aplicação
CREATE USER crm_user WITH PASSWORD 'senha_muito_segura_aqui';

-- Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE crm_advocacia TO crm_user;

-- Configurar privilégios de schema (necessário para PostgreSQL 15+)
\c crm_advocacia
GRANT ALL ON SCHEMA public TO crm_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO crm_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO crm_user;

-- Sair
\q
```

Configure otimizações de performance no PostgreSQL editando `/etc/postgresql/*/main/postgresql.conf`:

```bash
# Configurações otimizadas para a versão 3.0
shared_buffers = 256MB                    # 25% da RAM disponível
effective_cache_size = 1GB                # 75% da RAM disponível
work_mem = 4MB                           # Para queries complexas
maintenance_work_mem = 64MB              # Para operações de manutenção
checkpoint_completion_target = 0.9        # Para melhor performance de escrita
wal_buffers = 16MB                       # Para melhor performance de WAL
random_page_cost = 1.1                   # Para SSDs
```

### 3. Instalação da Aplicação

Clone o repositório e configure o ambiente da aplicação:

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/crm-advocacia.git
cd crm-advocacia

# Verificar se está na versão 3.0
git checkout v3.0

# Instalar dependências do backend
cd backend
npm install

# Instalar dependências específicas da versão 3.0
npm install joi bcryptjs jsonwebtoken helmet cors express-rate-limit

# Instalar dependências do frontend
cd ../frontend
npm install

# Instalar dependências Python
cd ../backend/src
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Configuração de Ambiente

A versão 3.0 introduz configurações adicionais de segurança e validação. Crie o arquivo `.env` no diretório backend:

```bash
# Configurações do banco de dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crm_advocacia
DB_USER=crm_user
DB_PASSWORD=senha_muito_segura_aqui

# Configurações de segurança (IMPORTANTES - gere chaves únicas)
JWT_SECRET=sua_chave_jwt_muito_segura_de_pelo_menos_64_caracteres_aqui
CREDENTIAL_ENCRYPTION_KEY=sua_chave_de_criptografia_de_credenciais_de_32_bytes

# Configurações da aplicação
NODE_ENV=production
PORT=3001
FRONTEND_URL=http://localhost:3000

# Configurações de rate limiting (novidade v3.0)
RATE_LIMIT_WINDOW_MS=900000  # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100  # máximo 100 requests por janela

# Configurações de logs (novidade v3.0)
LOG_LEVEL=info
LOG_FILE_PATH=./logs/application.log
LOG_MAX_SIZE=10MB
LOG_MAX_FILES=5

# Configurações de processamento de IA
CLAUDE_API_KEY=sua_chave_da_api_claude_aqui
OPENAI_API_KEY=sua_chave_da_api_openai_aqui (opcional)

# Configurações de automação
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_TIMEOUT=30000
COLLECTION_SCHEDULE=0 10 * * *  # 10h da manhã todos os dias
```

**IMPORTANTE**: Gere chaves de segurança únicas e seguras:

```bash
# Gerar JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Gerar CREDENTIAL_ENCRYPTION_KEY (exatamente 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Inicialização do Banco de Dados

Execute as migrações para criar a estrutura do banco de dados:

```bash
cd backend

# Executar migrações (cria todas as tabelas)
npm run migrate

# Executar seeds (dados iniciais)
npm run seed

# Verificar estrutura do banco
npm run db:status
```

A versão 3.0 inclui migrações adicionais para suporte às novas funcionalidades:

```sql
-- Novas tabelas para logs detalhados
CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    user_id INTEGER REFERENCES users(id)
);

-- Índices otimizados para performance
CREATE INDEX idx_system_logs_timestamp ON system_logs(timestamp);
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_category ON system_logs(category);

-- Tabela para métricas de qualidade
CREATE TABLE document_quality_metrics (
    id SERIAL PRIMARY KEY,
    intimacao_id INTEGER REFERENCES intimacoes(id),
    extraction_confidence DECIMAL(3,2),
    analysis_confidence DECIMAL(3,2),
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 6. Configuração de Segurança Avançada

A versão 3.0 implementa camadas adicionais de segurança que requerem configuração específica:

```bash
# Configurar firewall (Ubuntu)
sudo ufw enable
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 3000  # Frontend (desenvolvimento)
sudo ufw allow 3001  # Backend (desenvolvimento)

# Para produção, bloquear portas de desenvolvimento
sudo ufw deny 3000
sudo ufw deny 3001
```

Configure SSL/TLS para produção:

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d seu-dominio.com

# Configurar renovação automática
sudo crontab -e
# Adicionar linha: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 7. Configuração de Monitoramento

A versão 3.0 inclui monitoramento avançado que requer configuração inicial:

```bash
# Criar diretório de logs
sudo mkdir -p /var/log/crm-advocacia
sudo chown $USER:$USER /var/log/crm-advocacia

# Configurar rotação de logs
sudo tee /etc/logrotate.d/crm-advocacia << EOF
/var/log/crm-advocacia/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}
EOF
```

## Deployment em Produção

### 1. Configuração com Docker (Recomendado)

A versão 3.0 inclui configuração Docker otimizada para produção:

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: crm_advocacia
      POSTGRES_USER: crm_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backup:/backup
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    
  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    depends_on:
      - backend
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

### 2. Configuração de Nginx

Configure Nginx como proxy reverso com otimizações para a versão 3.0:

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3001;
    }
    
    upstream frontend {
        server frontend:3000;
    }
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    server {
        listen 80;
        server_name seu-dominio.com;
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name seu-dominio.com;
        
        ssl_certificate /etc/ssl/certs/fullchain.pem;
        ssl_certificate_key /etc/ssl/certs/privkey.pem;
        
        # Configurações de segurança
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
        
        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        # API Backend
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        # Login endpoint com rate limiting mais restritivo
        location /api/auth/login {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

### 3. Scripts de Deployment

Crie scripts automatizados para deployment:

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Iniciando deployment da versão 3.0..."

# Backup do banco de dados
echo "📦 Criando backup do banco de dados..."
docker-compose exec postgres pg_dump -U crm_user crm_advocacia > backup/backup_$(date +%Y%m%d_%H%M%S).sql

# Atualizar código
echo "📥 Atualizando código..."
git pull origin v3.0

# Rebuild containers
echo "🔨 Rebuilding containers..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Executar migrações
echo "🗄️ Executando migrações..."
docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate

# Restart serviços
echo "🔄 Reiniciando serviços..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Verificar saúde dos serviços
echo "🏥 Verificando saúde dos serviços..."
sleep 30
curl -f http://localhost/api/health || exit 1

echo "✅ Deployment concluído com sucesso!"
```

## Verificação da Instalação

### 1. Testes de Funcionalidade

Execute a suíte completa de testes para verificar a instalação:

```bash
# Testes do backend
cd backend
npm test

# Testes específicos da versão 3.0
npm run test:validation
npm run test:security
npm run test:integration

# Testes do frontend
cd ../frontend
npm test

# Testes end-to-end
npm run test:e2e
```

### 2. Verificação de Segurança

Execute verificações de segurança específicas da versão 3.0:

```bash
# Verificar configurações de segurança
npm run security:check

# Audit de dependências
npm audit

# Verificar SSL (se configurado)
curl -I https://seu-dominio.com

# Verificar rate limiting
ab -n 200 -c 10 http://seu-dominio.com/api/health
```

### 3. Monitoramento Inicial

Configure monitoramento para verificar operação contínua:

```bash
# Verificar logs em tempo real
tail -f /var/log/crm-advocacia/application.log

# Verificar métricas de performance
curl http://localhost:3001/api/metrics

# Verificar status do banco de dados
docker-compose exec postgres psql -U crm_user -d crm_advocacia -c "SELECT version();"
```

## Solução de Problemas de Instalação

### Problemas Comuns

**Erro de conexão com banco de dados:**
- Verifique se PostgreSQL está rodando: `sudo systemctl status postgresql`
- Verifique credenciais no arquivo `.env`
- Teste conexão manual: `psql -h localhost -U crm_user -d crm_advocacia`

**Erro de dependências Python:**
- Verifique se virtual environment está ativo: `source venv/bin/activate`
- Instale dependências do sistema: `sudo apt install python3-dev build-essential`
- Atualize pip: `pip install --upgrade pip`

**Erro de permissões:**
- Verifique permissões de diretório: `ls -la`
- Ajuste ownership: `sudo chown -R $USER:$USER .`
- Verifique permissões de logs: `sudo chmod 755 /var/log/crm-advocacia`

**Problemas de performance:**
- Verifique recursos disponíveis: `htop`
- Ajuste configurações do PostgreSQL baseado na RAM disponível
- Configure swap se necessário: `sudo swapon --show`

### Logs de Debug

Para problemas complexos, habilite logs detalhados:

```bash
# Habilitar debug no backend
export LOG_LEVEL=debug
npm start

# Habilitar debug no processamento Python
export PYTHONPATH=./src
export DEBUG=true
python -m juridico.processador_juridico
```

## Manutenção e Backup

### Backup Automatizado

Configure backup automatizado para proteção de dados:

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/crm-advocacia"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Backup do banco de dados
docker-compose exec postgres pg_dump -U crm_user crm_advocacia | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Backup de arquivos de configuração
tar -czf $BACKUP_DIR/config_backup_$DATE.tar.gz .env docker-compose.prod.yml nginx.conf

# Backup de logs importantes
tar -czf $BACKUP_DIR/logs_backup_$DATE.tar.gz /var/log/crm-advocacia/

# Limpeza de backups antigos (manter últimos 30 dias)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup concluído: $DATE"
```

Configure cron para execução automática:

```bash
# Adicionar ao crontab
0 2 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
```

### Monitoramento Contínuo

Configure monitoramento para operação em produção:

```bash
# Script de monitoramento
#!/bin/bash
# monitor.sh

# Verificar serviços
if ! curl -f http://localhost/api/health > /dev/null 2>&1; then
    echo "ALERT: API não está respondendo" | mail -s "CRM Alert" admin@escritorio.com
fi

# Verificar espaço em disco
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "ALERT: Espaço em disco baixo: ${DISK_USAGE}%" | mail -s "Disk Space Alert" admin@escritorio.com
fi

# Verificar logs de erro
ERROR_COUNT=$(tail -1000 /var/log/crm-advocacia/application.log | grep -c "ERROR")
if [ $ERROR_COUNT -gt 10 ]; then
    echo "ALERT: Muitos erros detectados: $ERROR_COUNT" | mail -s "Error Alert" admin@escritorio.com
fi
```

## Conclusão

A instalação da versão 3.0 do Sistema CRM para Escritórios de Advocacia foi projetada para ser robusta, segura e facilmente mantível. As melhorias implementadas garantem maior confiabilidade e performance, enquanto as novas funcionalidades de monitoramento e logging facilitam operação e manutenção contínuas.

Para suporte adicional durante a instalação, consulte a documentação técnica completa ou entre em contato com nossa equipe de suporte através dos canais oficiais. A versão 3.0 estabelece uma base sólida para crescimento futuro e adaptação às necessidades específicas do seu escritório.


