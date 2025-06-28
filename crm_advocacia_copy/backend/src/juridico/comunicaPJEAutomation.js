// ComunicaPJEAutomation.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class ComunicaPJEAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async init() {
        console.log('ComunicaPJEAutomation: Iniciando browser...');
        try {
            this.browser = await chromium.launch({
                headless: true, // Mantenha como true para execução em background
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            console.log('ComunicaPJEAutomation: Browser lançado.');

            console.log('ComunicaPJEAutomation: Criando nova página com User Agent...');
            this.page = await this.browser.newPage({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            });
            this.page.setDefaultTimeout(30000); // Configurar timeout padrão
            console.log('ComunicaPJEAutomation: User agent e timeout configurados.');
        } catch (error) {
            console.error('ComunicaPJEAutomation: Erro durante a inicialização:', error);
            throw error; // Propaga o erro para que seja tratado em JuridicoService
        }
    }

    /**
     * Extrai o texto de um elemento div.info-sumary dado o label em negrito.
     * @param {ElementHandle} element O elemento pai (card de intimação) onde buscar.
     * @param {string} label O texto do label (ex: "Órgão").
     * @returns {Promise<string>} O texto extraído ou 'N/A' se não encontrado.
     */
    async _getInfoText(element, label) {
        try {
            // Encontra o elemento <b> com o texto do label dentro de um div.info-sumary
            const bElement = await element.$(`div.info-sumary b:has-text("${label}:")`);
            if (bElement) {
                // Avalia o conteúdo do div.info-sumary e remove o texto do label
                const textContent = await bElement.evaluate(b => {
                    const parentDiv = b.closest('div.info-sumary');
                    if (parentDiv) {
                        // Pega todo o texto do div e remove o texto do <b>
                        return parentDiv.textContent.replace(b.textContent, '').trim();
                    }
                    return null;
                });
                return textContent || 'N/A';
            }
        } catch (e) {
            // console.warn(`Não foi possível extrair "${label}":`, e.message); // Descomente para depuração
        }
        return 'N/A';
    }

    /**
     * Extrai os dados das intimações da página atual.
     * Assume que a página já está carregada com os filtros aplicados.
     * @param {string} oabConsulta O número da OAB utilizado na consulta, para fins de rastreabilidade.
     * @param {string} siglaTribunal A sigla do tribunal utilizado na consulta, para fins de rastreabilidade.
     * @returns {Array<Object>} Uma lista de objetos contendo os dados das intimações da página.
     */
    async _extrairDadosPaginaAtual(oabConsulta, siglaTribunal) {
        const MAX_RETRIES = 3; // Número máximo de tentativas
        let retries = 0;
        const SELECTOR_TIMEOUT = 30000; // Seu timeout atual de 30 segundos

        while (retries < MAX_RETRIES) {
            try {
                await this.page.waitForSelector('article.card', { timeout: SELECTOR_TIMEOUT });
                break; // Se encontrou, sai do loop de retentativas
            } catch (error) {
                console.warn(`[ComunicaPJEAutomation] Tentativa ${retries + 1} de ${MAX_RETRIES} falhou ao esperar por 'article.card'. Erro: ${error.message}`);
                retries++;
                if (retries === MAX_RETRIES) {
                    throw error; // Se todas as tentativas falharam, re-lança o erro
                }
                await this.page.waitForTimeout(5000); // Espera 5 segundos antes de tentar novamente
            }
        }

        const resultados = await this.page.$$('article.card');
        console.log(`Encontrados ${resultados.length} resultados na página atual.`);

        const intimacoesPagina = [];

        for (let i = 0; i < resultados.length; i++) {
            let numeroProcesso = 'N/A'; // Declarar aqui para garantir o escopo
            let teorIntimacao = 'N/A'; // Variável para o teor completo
            let urlCertidao = 'N/A'; // Manter para referência, mas não será usado para conteúdo

            try {
                const resultado = resultados[i];

                // Extrair informações da intimação usando seletores baseados na estrutura fornecida
                numeroProcesso = await resultado.$eval('span.numero-unico-formatado', el => el.textContent?.trim()).catch(() => 'N/A');
                
                const orgao = await this._getInfoText(resultado, 'Órgão');
                const dataDisponibilizacao = await this._getInfoText(resultado, 'Data de disponibilização');
                const tipoComunicacao = await this._getInfoText(resultado, 'Tipo de comunicação');
                const meio = await this._getInfoText(resultado, 'Meio');
                
                // Link para o inteiro teor (o link que leva para o PDF ou outra página com o teor)
                const linkInteiroTeorElement = await resultado.$('div.info-sumary b:has-text("Inteiro teor:") + a');
                const linkInteiroTeor = linkInteiroTeorElement ? await linkInteiroTeorElement.getAttribute('href') : 'N/A';

                // Extrair Advogado(s) e OAB
                let advogadoOABCompleto = 'N/A';
                const advogadoElement = await resultado.$('div.info-sumary div.row div.col-md-10');
                if (advogadoElement) {
                    advogadoOABCompleto = await advogadoElement.textContent();
                    advogadoOABCompleto = advogadoOABCompleto ? advogadoOABCompleto.trim() : 'N/A';
                }

                // *** NOVA EXTRAÇÃO: TEOR COMPLETO DA INTIMAÇÃO ***
                // O teor completo está dentro de <section class="content-texto"> -> <div class="tab_panel2">
                const teorElement = await resultado.$('section.content-texto div.tab_panel2');
                if (teorElement) {
                    teorIntimacao = await teorElement.textContent();
                    teorIntimacao = teorIntimacao ? teorIntimacao.trim() : 'N/A';
                }

                // *** EXTRAÇÃO DO LINK DE CERTIDÃO (IMPRIMIR) - OPCIONAL ***
                // Se você ainda quiser o link para o PDF original, mesmo sem baixá-lo,
                // pode tentar extraí-lo. No entanto, a lógica de clique no menu
                // e espera por elementos que interceptam o clique é o que tem causado problemas.
                // Por enquanto, vamos simplificar e apenas tentar pegar o link se ele estiver visível
                // sem cliques adicionais que podem falhar.
                const urlCertidaoElement = await resultado.$('ul.acoes a[title="Imprimir"]'); 
                urlCertidao = urlCertidaoElement ? await urlCertidaoElement.getAttribute('href') : 'N/A';


                intimacoesPagina.push({
                    numeroProcesso,
                    orgao,
                    dataDisponibilizacao,
                    tipoComunicacao,
                    meio,
                    linkInteiroTeor,
                    urlCertidao, // Link para a certidão/impressão (pode ser N/A se não for facilmente acessível)
                    advogadoOABCompleto,
                    teor: teorIntimacao, // O teor completo extraído da página
                    tribunal: siglaTribunal,
                    oabConsulta: oabConsulta
                });

            } catch (error) {
                console.error(`Erro ao processar resultado ${i} (Processo: ${numeroProcesso}):`, error);
            }
        }
        return intimacoesPagina;
    }

    async processarPaginacao() {
        try {
            const proximaPaginaButton = await this.page.$('a.ui-paginator-next:not(.ui-state-disabled)');

            if (proximaPaginaButton) {
                console.log('Clicando no botão de próxima página...');
                // Clica no botão. O Playwright já tem retries embutidos para visibilidade/estabilidade.
                await proximaPaginaButton.click();
                
                // Espera que a rede esteja ociosa após o clique, indicando que o novo conteúdo carregou.
                // Aumentei o timeout para 45 segundos para dar mais tempo.
                await this.page.waitForLoadState('networkidle', { timeout: 45000 }); 
                
                // Espera que os cards de intimação estejam presentes na nova página.
                await this.page.waitForSelector('article.card', { timeout: 15000 });
                
                // Adiciona um pequeno atraso fixo como uma camada extra de segurança
                // para garantir que a página esteja totalmente renderizada e interativa.
                await this.page.waitForTimeout(2000); // Espera 2 segundos

                console.log('Nova página carregada.');
                return true;
            }
            console.log('Não há mais páginas ou botão de próxima página desabilitado.');
            return false;
        } catch (error) {
            console.error('Erro na paginação:', error);
            // Se o clique em si falhar devido a interceptação, este catch irá capturá-lo.
            return false;
        }
    }

    /**
     * Coleta todas as intimações para uma OAB e período de datas específicos.
     * Esta função agora encapsula a navegação inicial e a lógica de paginação.
     * @param {string} numeroOAB O número da OAB do advogado.
     * @param {string} dataInicio Data de início da busca (formato YYYY-MM-DD).
     * @param {string} dataFim Data de fim da busca (formato YYYY-MM-DD).
     * @param {string} siglaTribunal Sigla do tribunal (padrão 'TJCE').
     * @returns {Array<Object>} Uma lista de objetos contendo os dados de todas as intimações coletadas.
     */
    async coletarIntimacoes(numeroOAB, dataInicio, dataFim, siglaTribunal = 'TJCE') {
        const todasIntimacoes = [];
        let paginaAtual = 1;
        const MAX_PAGES = 100; // Limite de segurança para evitar loops infinitos

        try {
            console.log(`Iniciando coleta de intimações para OAB: ${numeroOAB}, Período: ${dataInicio} a ${dataFim}`);

            // Construir URL com todos os parâmetros, incluindo numeroOab
            const url = `https://comunica.pje.jus.br/consulta?siglaTribunal=${siglaTribunal}&dataDisponibilizacaoInicio=${dataInicio}&dataDisponibilizacaoFim=${dataFim}&numeroOab=${numeroOAB}`;

            console.log(`Acessando: ${url}` );
            // Navegar para a URL. 'networkidle' espera que não haja mais requisições de rede por um tempo.
            await this.page.goto(url, { waitUntil: 'networkidle' });

            // Loop para coletar dados da página atual e depois paginar
            while (paginaAtual <= MAX_PAGES) {
                console.log(`Processando página ${paginaAtual}...`);
                // Passa numeroOAB e siglaTribunal para _extrairDadosPaginaAtual para rastreabilidade
                const intimacoesPagina = await this._extrairDadosPaginaAtual(numeroOAB, siglaTribunal);
                todasIntimacoes.push(...intimacoesPagina);
                console.log(`Página ${paginaAtual}: Coletadas ${intimacoesPagina.length} intimações.`);

                // Verificar paginação
                const hasNextPage = await this.processarPaginacao();
                if (!hasNextPage) {
                    console.log('Fim da paginação. Todas as intimações coletadas.');
                    break; // Não há mais páginas, sair do loop
                }
                paginaAtual++;
            }

            if (paginaAtual > MAX_PAGES) {
                console.warn(`Limite máximo de ${MAX_PAGES} páginas atingido. A coleta pode estar incompleta.`);
            }

            console.log(`Coleta completa. Total de intimações coletadas: ${todasIntimacoes.length}`);
            return todasIntimacoes;

        } catch (error) {
            console.error('Erro na coleta completa de intimações:', error);
            throw error;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            console.log('ComunicaPJEAutomation: Browser fechado.');
        }
    }
}

module.exports = ComunicaPJEAutomation;

