const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class PJETJCEAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isLoggedIn = false;
    }

    async init() {
        console.log('PJETJCEAutomation: Iniciando browser...');
        try {
            this.browser = await chromium.launch({ 
                headless: true, // Mantenha como true para execução em background
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            console.log('PJETJCEAutomation: Browser lançado.');

            console.log('PJETJCEAutomation: Criando nova página com User Agent...');
            this.page = await this.browser.newPage({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            });
            console.log('PJETJCEAutomation: Página criada. Tipo de this.page:', typeof this.page);
            console.log('PJETJCEAutomation: this.page é um objeto?', this.page && typeof this.page === 'object');
            console.log('PJETJCEAutomation: this.page tem setUserAgent?', typeof this.page.setUserAgent);
            
            // Configurar timeout padrão
            this.page.setDefaultTimeout(30000);
            
        } catch (error) {
            console.error('PJETJCEAutomation: Erro durante a inicialização:', error);
            throw error; // Propaga o erro
        }
    }

    async login(usuario, senha) {
        try {
            console.log(`Iniciando login no PJE TJCE para usuário: ${usuario}`);
            
            // Acessar página de login
            await this.page.goto('https://pje.tjce.jus.br/pje1grau/login.seam', { waitUntil: 'networkidle' });
            
            // Aguardar o frame SSO aparecer
            await this.page.waitForSelector('#ssoFrame', { timeout: 10000 });
            
            // Acessar o frame SSO
            const ssoFrame = await this.page.frame('ssoFrame');
            if (!ssoFrame) {
                throw new Error('Frame SSO não encontrado');
            }
            
            // Aguardar campos de login no frame
            await ssoFrame.waitForSelector('#username', { timeout: 10000 });
            await ssoFrame.waitForSelector('#password', { timeout: 10000 });
            
            // Preencher credenciais
            console.log('Preenchendo credenciais...');
            await ssoFrame.fill('#username', usuario);
            await ssoFrame.fill('#password', senha);
            
            // Clicar no botão entrar
            console.log('Clicando no botão entrar...');
            await ssoFrame.click('#kc-login');
            
            // Aguardar redirecionamento ou erro
            await this.page.waitForTimeout(5000);
            
            // Verificar se o login foi bem-sucedido
            const currentUrl = this.page.url();
            if (currentUrl.includes('login') || currentUrl.includes('error')) {
                throw new Error('Falha no login - credenciais inválidas ou erro no sistema');
            }
            
            this.isLoggedIn = true;
            console.log('Login realizado com sucesso');
            return true;
            
        } catch (error) {
            console.error('Erro no login:', error);
            this.isLoggedIn = false;
            throw error;
        }
    }

    async consultarProcesso(numeroProcesso) {
        try {
            if (!this.isLoggedIn) {
                throw new Error('Usuário não está logado');
            }
            
            console.log(`Consultando processo: ${numeroProcesso}`);
            
            // Acessar página de consulta
            await this.page.goto('https://pje.tjce.jus.br/pje1grau/Processo/ConsultaProcesso/listView.seam', { waitUntil: 'networkidle' });
            
            // Aguardar campo de número do processo
            await this.page.waitForSelector('#fPP\\:numeroProcesso\\:numeroSequencial', { timeout: 10000 });
            
            // Limpar e preencher número do processo
            await this.page.fill('#fPP\\:numeroProcesso\\:numeroSequencial', '');
            await this.page.fill('#fPP\\:numeroProcesso\\:numeroSequencial', numeroProcesso);
            
            // Clicar no botão pesquisar
            console.log('Pesquisando processo...');
            await this.page.click('#fPP\\:searchProcessos');
            
            // Aguardar resultados
            await this.page.waitForTimeout(3000);
            
            // Verificar se o processo foi encontrado
            const linkProcesso = await this.page.$(`a[title="${numeroProcesso}"]`);
            if (!linkProcesso) {
                console.log(`Processo ${numeroProcesso} não encontrado`);
                return null;
            }
            
            // Clicar no link do processo (abre em nova aba)
            console.log('Abrindo processo...');
            const [novaAba] = await Promise.all([
                this.page.context().waitForEvent('page'),
                linkProcesso.click()
            ]);
            
            // Aguardar a nova aba carregar
            await novaAba.waitForLoadState('networkidle');
            
            return novaAba;
            
        } catch (error) {
            console.error('Erro na consulta do processo:', error);
            throw error;
        }
    }

    async baixarDocumentosProcesso(abaProcesso, numeroProcesso) {
        try {
            console.log(`Baixando documentos do processo: ${numeroProcesso}`);
            
            // Aguardar ícone de download aparecer
            await abaProcesso.waitForSelector('.fa-download', { timeout: 10000 });
            
            // Clicar no ícone de download
            await abaProcesso.click('.fa-download');
            await abaProcesso.waitForTimeout(2000);
            
            // Aguardar menu de download aparecer
            await abaProcesso.waitForSelector('#navbar\\:j_id213', { timeout: 5000 });
            
            // Configurar listener para download
            const downloadPromise = abaProcesso.waitForEvent('download');
            
            // Clicar no botão de download do processo
            await abaProcesso.click('#navbar\\:j_id213');
            
            // Aguardar download iniciar
            const download = await downloadPromise;
            
            // Criar diretório se não existir
            const diretorio = path.join(__dirname, '../../uploads/processos', numeroProcesso);
            if (!fs.existsSync(diretorio)) {
                fs.mkdirSync(diretorio, { recursive: true });
            }
            
            // Salvar arquivo
            const nomeArquivo = `processo_${numeroProcesso}_${Date.now()}.zip`;
            const caminhoArquivo = path.join(diretorio, nomeArquivo);
            await download.saveAs(caminhoArquivo);
            
            console.log(`Documentos salvos em: ${caminhoArquivo}`);
            return caminhoArquivo;
            
        } catch (error) {
            console.error('Erro ao baixar documentos:', error);
            throw error;
        }
    }

    async extrairDocumentosEssenciais(abaProcesso, numeroProcesso) {
        try {
            console.log(`Extraindo documentos essenciais do processo: ${numeroProcesso}`);
            
            const documentosEssenciais = [
                'petição inicial',
                'despacho',
                'intimação',
                'parecer do ministério público',
                'contestação',
                'decisão',
                'sentença',
                'mandado'
            ];
            
            const documentosEncontrados = [];
            
            // Procurar por documentos na página
            const elementos = await abaProcesso.$$('.documento-item, .movimento-item, .evento-item');
            
            for (const elemento of elementos) {
                try {
                    const texto = await elemento.textContent();
                    const textoLower = texto.toLowerCase();
                    
                    // Verificar se é um documento essencial
                    const tipoDocumento = documentosEssenciais.find(tipo => 
                        textoLower.includes(tipo)
                    );
                    
                    if (tipoDocumento) {
                        // Procurar link de download
                        const linkDownload = await elemento.$('a[href*="download"], a[href*="visualizar"]');
                        if (linkDownload) {
                            const url = await linkDownload.getAttribute('href');
                            
                            documentosEncontrados.push({
                                tipo: tipoDocumento,
                                texto: texto.trim(),
                                url: url,
                                numeroProcesso: numeroProcesso
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erro ao processar elemento:', error);
                }
            }
            
            console.log(`Encontrados ${documentosEncontrados.length} documentos essenciais`);
            return documentosEncontrados;
            
        } catch (error) {
            console.error('Erro na extração de documentos essenciais:', error);
            throw error;
        }
    }

    async processarProcesso(numeroProcesso, usuario, senha) {
        let abaProcesso = null;
        
        try {
            // Fazer login se necessário
            if (!this.isLoggedIn) {
                await this.login(usuario, senha);
            }
            
            // Consultar processo
            abaProcesso = await this.consultarProcesso(numeroProcesso);
            if (!abaProcesso) {
                return null;
            }
            
            // Extrair documentos essenciais
            const documentos = await this.extrairDocumentosEssenciais(abaProcesso, numeroProcesso);
            
            // Baixar processo completo (opcional)
            let caminhoZip = null;
            try {
                caminhoZip = await this.baixarDocumentosProcesso(abaProcesso, numeroProcesso);
            } catch (error) {
                console.warn('Não foi possível baixar o processo completo:', error.message);
            }
            
            return {
                numeroProcesso,
                documentos,
                caminhoZip,
                dataProcessamento: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`Erro ao processar processo ${numeroProcesso}:`, error);
            throw error;
        } finally {
            // Fechar aba do processo se foi aberta
            if (abaProcesso && !abaProcesso.isClosed()) {
                await abaProcesso.close();
            }
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            this.isLoggedIn = false;
            console.log('PJETJCEAutomation: Browser fechado.');
        }
    }
}

module.exports = PJETJCEAutomation;


