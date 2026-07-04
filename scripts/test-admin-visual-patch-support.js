const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
const PORT = 3897;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function contentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.html') return 'text/html; charset=utf-8';
    if (ext === '.js') return 'application/javascript; charset=utf-8';
    if (ext === '.css') return 'text/css; charset=utf-8';
    if (ext === '.svg') return 'image/svg+xml';
    if (ext === '.png') return 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.webp') return 'image/webp';
    return 'application/octet-stream';
}

function startStaticServer() {
    const server = http.createServer(function (req, res) {
        const url = new URL(req.url, BASE_URL);
        let filePath = path.join(ROOT, decodeURIComponent(url.pathname.replace(/^\/+/, '')));
        if (url.pathname === '/') filePath = path.join(ROOT, 'admin', 'index.html');
        if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType(filePath) });
        fs.createReadStream(filePath).pipe(res);
    });
    return new Promise(function (resolve) {
        server.listen(PORT, '127.0.0.1', function () { resolve(server); });
    });
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

const blocks = {
    home: { slug: 'home', version: 1, body_json: { hero: { title: 'Home' } } },
    solutions: {
        slug: 'solutions',
        version: 1,
        body_json: {
            overview: {
                title: 'Solutions by Project Scenario',
                cards: [
                    { title: 'EPC', text: 'English EPC', items: ['Best fit', 'Includes', 'Confirm'] },
                    { title: 'Line O&M', text: 'English O&M', items: ['Highways', 'Inspection', 'Confirm'] },
                    { title: 'Power Distribution Integration', text: 'English distribution', items: ['Factories', 'Transformers', 'Confirm'] }
                ],
                cardsPatchFr: {
                    index_2: {
                        textFr: '',
                        titleFr: 'Intégration de distribution électrique',
                        itemsFr: ['Usines, parcs, bâtiments et postes', 'Transformateurs secs', 'À valider']
                    }
                },
                cardsPatchRu: {
                    index_2: {
                        titleRu: 'Интеграция распределения электроэнергии',
                        itemsRu: ['Заводы и парки', 'Трансформаторы', 'Подтвердить']
                    }
                }
            },
            sections: [
                {
                    id: 'engineering-epc',
                    title: 'Engineering EPC',
                    text: 'English EPC text',
                    bullets: ['English bullet 0', 'English bullet 1'],
                    button: { label: 'Discuss EPC' }
                },
                {
                    title: 'Representative General Contracting References',
                    cards: [
                        { title: 'Reference A', text: 'English reference A' }
                    ]
                }
            ],
            sectionsPatchFr: {
                'engineering-epc': {
                    titleFr: 'Contractant général d’ingénierie',
                    bulletsFr: ['Ingénierie de distribution électrique', 'Livraison intégrée'],
                    button: { labelFr: 'Discuter du projet EPC' }
                },
                index_1: {
                    cardsPatchFr: {
                        index_0: {
                            titleFr: 'FR EPC reference',
                            textFr: 'FR reference text.'
                        }
                    }
                }
            },
            sectionsPatchRu: {
                index_1: {
                    cardsPatchRu: {
                        index_0: {
                            titleRu: 'RU EPC reference',
                            textRu: 'RU reference text.'
                        }
                    }
                },
                'engineering-epc': {
                    titleRu: 'Генеральный подряд EPC',
                    bulletsRu: ['Инженерия распределения', 'Комплексная поставка'],
                    button: { labelRu: 'Обсудить проект EPC' }
                }
            }
        }
    },
    'product-pages': {
        slug: 'product-pages',
        version: 1,
        body_json: {
            detailHero: { title: 'Product Detail' },
            detailFaq: [
                { question: 'Can Longxiang customize voltage?', answer: 'Yes.' }
            ],
            detailFaqPatchFr: {
                index_0: {
                    questionFr: 'Longxiang peut-il fournir une tension personnalisée ?',
                    answerFr: 'Oui.'
                }
            },
            detailFaqPatchRu: {
                index_0: {
                    questionRu: 'Может ли Longxiang настроить напряжение?',
                    answerRu: 'Да.'
                }
            }
        }
    },
    contact: {
        slug: 'contact',
        version: 1,
        body_json: {
            contactPage: {
                faq: {
                    title: 'FAQ',
                    items: [
                        { question: 'How fast do you reply?', answer: 'Usually within 24 hours.' }
                    ],
                    itemsPatchFr: {
                        index_0: {
                            questionFr: 'Sous quel délai répondez-vous ?',
                            answerFr: 'Généralement sous 24 heures.'
                        }
                    },
                    itemsPatchRu: {
                        index_0: {
                            questionRu: 'Как быстро вы отвечаете?',
                            answerRu: 'Обычно в течение 24 часов.'
                        }
                    }
                }
            }
        }
    },
    education: {
        slug: 'education',
        version: 1,
        body_json: {
            sections: [
                {
                    id: 'industry-college',
                    title: 'Industry College',
                    deliverables: ['Planning', 'Training path', 'Base']
                }
            ],
            sectionsPatchFr: {
                'industry-college': {
                    titleFr: 'Institut industriel co-construit',
                    deliverablesFr: ['Planification', 'Parcours de formation', 'Base de démonstration']
                }
            },
            sectionsPatchRu: {
                'industry-college': {
                    titleRu: 'Совместный индустриальный институт',
                    deliverablesRu: ['Планирование', 'Учебный маршрут', 'Демонстрационная база']
                }
            }
        }
    },
    about: { slug: 'about-us', version: 1, body_json: { hero: { title: 'About' } } },
    global: { slug: 'global-shell', version: 1, body_json: { navigation: { mainLinks: [] } } }
};

function apiBlock(slug) {
    return clone(blocks[slug] || { slug, version: 1, body_json: {} });
}

async function clickVisualModule(page, pageKey, moduleKey) {
    await page.waitForSelector('#visual-builder-root .visual-builder-shell', { timeout: 10000 });
    await page.click(`[data-visual-nav-page="${pageKey}"][data-visual-nav-module="${moduleKey}"]`);
    await page.waitForLoadState('networkidle').catch(function () {});
    await page.waitForFunction(function (args) {
        const active = document.querySelector('[data-visual-nav-page].active');
        return active &&
            active.getAttribute('data-visual-nav-page') === args.pageKey &&
            active.getAttribute('data-visual-nav-module') === args.moduleKey;
    }, { pageKey, moduleKey }, { timeout: 10000 }).catch(function () {});
    await page.waitForSelector('#visual-editor-content [data-visual-field]', { timeout: 10000 });
    await page.waitForFunction(function (key) {
        var title = document.querySelector('#visual-editor-content .visual-editor-header h3');
        return title && title.textContent && title.textContent.length && document.querySelector('[data-visual-nav-module="' + key + '"].active');
    }, moduleKey, { timeout: 10000 }).catch(function () {});
    await page.waitForTimeout(150);
}

async function switchLanguage(page, languageKey) {
    await page.click(`[data-visual-language="${languageKey}"]`);
    await page.waitForFunction(function (key) {
        const active = document.querySelector('[data-visual-language].active');
        return active && active.getAttribute('data-visual-language') === key;
    }, languageKey, { timeout: 10000 });
    await page.waitForSelector('#visual-editor-content [data-visual-field]', { timeout: 10000 });
    await page.waitForTimeout(150);
}

async function fieldSnapshot(page) {
    return page.$$eval('#visual-editor-content [data-visual-field]', function (fields) {
        return fields.map(function (field) {
            return {
                path: field.getAttribute('data-visual-field'),
                value: field.value || ''
            };
        });
    });
}

function assertField(fields, path, text) {
    const field = fields.find((item) => item.path === path);
    if (!field) {
        throw new Error(`Missing visual field path: ${path}\nAvailable paths:\n${fields.map((item) => item.path).join('\n')}`);
    }
    if (text && !field.value.includes(text)) {
        throw new Error(`Field ${path} does not include expected text: ${text}`);
    }
}

async function main() {
    const server = await startStaticServer();
    let capturedSolutionsSave = null;
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.route('**/api/**', (route) => route.fulfill({ json: { ok: true, data: [] } }));
        await page.route('**/api/admin/**', (route) => route.fulfill({ json: { ok: true, data: [], meta: { page: 1, pageSize: 20, total: 0 } } }));
        await page.route('**/api/auth/verify', (route) => route.fulfill({ json: { ok: true, username: 'admin' } }));
        await page.route('**/api/admin/content-blocks/*', async function (route) {
            const request = route.request();
            const url = new URL(request.url());
            const slug = decodeURIComponent(url.pathname.split('/').pop());
            if (request.method() === 'PUT') {
                const payload = request.postDataJSON();
                if (slug === 'solutions') capturedSolutionsSave = payload;
                const block = apiBlock(slug);
                block.version += 1;
                block.body_json = payload.body_json;
                return route.fulfill({ json: { ok: true, data: block } });
            }
            return route.fulfill({ json: { ok: true, data: apiBlock(slug) } });
        });

        await page.addInitScript(function () {
            window.localStorage.setItem('admin_token', 'test-token');
            window.localStorage.setItem('admin_username', 'admin');
        });

        await page.goto(`${BASE_URL}/admin/index.html#visual-builder`, { waitUntil: 'networkidle' });
        await page.waitForSelector('#visual-builder-root .visual-builder-shell', { timeout: 10000 });

        await clickVisualModule(page, 'solutions', 'overview');
        await switchLanguage(page, 'fr');
        let fields = await fieldSnapshot(page);
        assertField(fields, 'overview.cardsPatchFr.index_2.itemsFr', 'Usines, parcs');
        assertField(fields, 'overview.cardsPatchFr.index_2.textFr', '');
        if (fields.find((item) => item.path === 'overview.cardsPatchFr.index_2.textFr').value !== '') {
            throw new Error('Empty Fr patch field should not fall back to the neutral overview card text.');
        }
        await page.fill('[data-visual-field="overview.cardsPatchFr.index_2.itemsFr"]', 'Usines locales\nTransformateurs locaux');
        await page.click('[data-visual-save]');
        await page.waitForFunction(function () { return document.querySelector('#visual-save-status') && document.querySelector('#visual-save-status').textContent.indexOf('保存') === -1; }, null, { timeout: 10000 }).catch(function () {});
        if (!capturedSolutionsSave) throw new Error('Save payload for solutions was not captured.');
        const savedBody = capturedSolutionsSave.body_json;
        if (savedBody.overview.cards[2].items[0] !== 'Factories') {
            throw new Error('Neutral overview.cards array was overwritten during Fr save.');
        }
        if (!savedBody.overview.cardsPatchFr || savedBody.overview.cardsPatchFr.index_2.itemsFr[0] !== 'Usines locales') {
            throw new Error('Fr save did not write overview.cardsPatchFr.index_2.itemsFr.');
        }

        await clickVisualModule(page, 'solutions', 'engineeringEpc');
        await switchLanguage(page, 'fr');
        fields = await fieldSnapshot(page);
        assertField(fields, 'sectionsPatchFr.index_1.cardsPatchFr.index_0.titleFr', 'FR EPC reference');
        assertField(fields, 'sectionsPatchFr.engineering-epc.bulletsFr', 'Ingénierie de distribution électrique');
        await switchLanguage(page, 'ru');
        fields = await fieldSnapshot(page);
        assertField(fields, 'sectionsPatchRu.index_1.cardsPatchRu.index_0.titleRu', 'RU EPC reference');
        assertField(fields, 'sectionsPatchRu.engineering-epc.bulletsRu', 'Инженерия распределения');

        await clickVisualModule(page, 'products', 'detail');
        await switchLanguage(page, 'fr');
        fields = await fieldSnapshot(page);
        assertField(fields, 'detailFaqPatchFr.index_0.questionFr', 'Longxiang peut-il');
        await switchLanguage(page, 'ru');
        fields = await fieldSnapshot(page);
        assertField(fields, 'detailFaqPatchRu.index_0.questionRu', 'Может ли Longxiang');

        await clickVisualModule(page, 'contact', 'faq');
        await switchLanguage(page, 'fr');
        fields = await fieldSnapshot(page);
        assertField(fields, 'contactPage.faq.itemsPatchFr.index_0.questionFr', 'Sous quel délai');
        await switchLanguage(page, 'ru');
        fields = await fieldSnapshot(page);
        assertField(fields, 'contactPage.faq.itemsPatchRu.index_0.questionRu', 'Как быстро');

        await clickVisualModule(page, 'education', 'industryCollege');
        await switchLanguage(page, 'fr');
        fields = await fieldSnapshot(page);
        assertField(fields, 'sectionsPatchFr.industry-college.deliverablesFr', 'Planification');
        await switchLanguage(page, 'ru');
        fields = await fieldSnapshot(page);
        assertField(fields, 'sectionsPatchRu.industry-college.deliverablesRu', 'Планирование');

        const hasArrayMutationsInRu = await page.locator('#visual-editor-content [data-visual-array-action="add"]').count();
        if (hasArrayMutationsInRu !== 0) throw new Error('Ru patch mode still exposes array structure mutation controls.');

        console.log('admin visual Fr/Ru patch support OK');
    } finally {
        await browser.close();
        server.close();
    }
}

main().catch(function (err) {
    console.error(err);
    process.exit(1);
});
