const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
const PORT = 3897;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ADMIN_CACHE_VERSION = '20260713-about-visual';

function svgAsset(width, height, color) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${color}"/></svg>`;
}

const TEST_ASSETS = {
    '/test-assets/capability-original.svg': svgAsset(640, 480, '#547aa5'),
    '/test-assets/factory-original.svg': svgAsset(960, 640, '#9c6644'),
    '/test-assets/dimension-320x180.svg': svgAsset(320, 180, '#3a86ff'),
    '/test-assets/dimension-450x300.svg': svgAsset(450, 300, '#ef476f'),
    '/test-assets/dimension-slow-240x160.svg': svgAsset(240, 160, '#06d6a0')
};

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
        if (TEST_ASSETS[url.pathname]) {
            const sendAsset = function () {
                res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8' });
                res.end(TEST_ASSETS[url.pathname]);
            };
            if (url.pathname.indexOf('dimension-slow') !== -1) setTimeout(sendAsset, 650);
            else sendAsset();
            return;
        }
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
    'about-us': {
        slug: 'about-us',
        version: 1,
        body_json: {
            hero: { title: 'About', untouched: 'keep-hero' },
            untouchedModule: { marker: 'keep-about-data' },
            capability: {
                kicker: 'Project Delivery',
                title: 'End-to-end capability for distribution projects',
                text: 'English capability text.',
                cards: [
                    {
                        title: 'Engineering',
                        text: 'English engineering text.',
                        image: { src: 'test-assets/capability-original.svg', alt: 'Engineering capability', width: 640, height: 480 }
                    },
                    {
                        title: 'Manufacturing',
                        text: 'English manufacturing text.',
                        image: { src: 'test-assets/capability-original.svg', alt: 'Manufacturing capability', width: 640, height: 480 }
                    }
                ],
                cardsPatchFr: {
                    index_0: { titleFr: 'Ingénierie', textFr: 'Texte français.', image: { altFr: 'Capacité d’ingénierie' } }
                },
                cardsPatchRu: {
                    index_0: { titleRu: 'Проектирование', textRu: 'Русский текст.', image: { altRu: 'Инженерные возможности' } }
                }
            },
            factory: {
                kicker: 'Factory Evidence',
                title: 'Real production scenes, not stock imagery',
                text: 'English factory text.',
                images: [
                    {
                        caption: 'Transformer workshop',
                        image: { src: 'test-assets/factory-original.svg', alt: 'Transformer workshop', width: 960, height: 640 }
                    },
                    {
                        caption: 'Switchgear line',
                        image: { src: 'test-assets/factory-original.svg', alt: 'Switchgear line', width: 960, height: 640 }
                    }
                ],
                imagesPatchFr: {
                    index_0: { captionFr: 'Atelier de transformateurs', image: { altFr: 'Atelier de transformateurs' } }
                },
                imagesPatchRu: {
                    index_0: { captionRu: 'Цех трансформаторов', image: { altRu: 'Цех трансформаторов' } }
                }
            }
        }
    },
    contact: {
        slug: 'contact',
        version: 1,
        body_json: {
            email: 'sales@longxiang.test',
            instagram: 'https://www.instagram.com/longxiang.test/',
            youtube: 'https://www.youtube.com/@longxiang-test',
            contactPage: {
                faq: {
                    items: [{ question: 'How quickly?', answer: 'Within one business day.' }],
                    itemsPatchFr: { index_0: { questionFr: 'Sous quel délai ?', answerFr: 'Sous un jour ouvré.' } },
                    itemsPatchRu: { index_0: { questionRu: 'Как быстро?', answerRu: 'В течение рабочего дня.' } }
                }
            }
        }
    },
    'global-shell': { slug: 'global-shell', version: 1, body_json: { navigation: { mainLinks: [] } } }
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
                value: field.value || '',
                type: field.type || '',
                checked: field.type === 'checkbox' ? field.checked : null
            };
        });
    });
}

async function selectVisualAsset(page, fieldPath, assetId) {
    const field = page.locator(`[data-visual-field="${fieldPath}"]`);
    const fieldId = await field.getAttribute('id');
    if (!fieldId) throw new Error(`Visual asset field has no id: ${fieldPath}`);
    await page.click(`[data-visual-select-asset="${fieldId}"]`);
    await page.waitForSelector('#asset-picker-modal.show [data-asset-picker-id]', { timeout: 10000 });
    await page.click(`#asset-picker-modal [data-asset-picker-id="${assetId}"]`);
    await page.click('#asset-picker-confirm');
}

async function waitForVisualSave(page) {
    await page.waitForFunction(function () {
        var status = document.querySelector('#visual-save-status');
        var button = document.querySelector('[data-visual-save]');
        return status && status.textContent.indexOf('保存中') === -1 && button && !button.disabled;
    }, null, { timeout: 10000 });
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
    let capturedContactSave = null;
    let capturedGlobalShellSave = null;
    const capturedAboutSaves = [];
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.route('**/api/**', (route) => route.fulfill({ json: { ok: true, data: [] } }));
        await page.route('**/api/admin/**', (route) => route.fulfill({ json: { ok: true, data: [], meta: { page: 1, pageSize: 20, total: 0 } } }));
        await page.route('**/api/auth/verify', (route) => route.fulfill({ json: { ok: true, username: 'admin' } }));
        await page.route('**/api/admin/assets**', (route) => route.fulfill({
            json: {
                ok: true,
                data: [
                    { id: 'capability-good', path: 'test-assets/dimension-320x180.svg', original_name: 'Capability replacement', mime_type: 'image/svg+xml', module: 'test', usage_count: 0 },
                    { id: 'factory-good', path: 'test-assets/dimension-450x300.svg', original_name: 'Factory replacement', mime_type: 'image/svg+xml', module: 'test', usage_count: 0 },
                    { id: 'slow-good', path: 'test-assets/dimension-slow-240x160.svg', original_name: 'Slow replacement', mime_type: 'image/svg+xml', module: 'test', usage_count: 0 },
                    { id: 'broken', path: 'test-assets/missing.svg', original_name: 'Broken replacement', mime_type: 'image/svg+xml', module: 'test', usage_count: 0 }
                ],
                meta: { page: 1, pageSize: 20, total: 4 }
            }
        }));
        await page.route('**/api/admin/content-blocks/*', async function (route) {
            const request = route.request();
            const url = new URL(request.url());
            const slug = decodeURIComponent(url.pathname.split('/').pop());
            if (request.method() === 'PUT') {
                const payload = request.postDataJSON();
                if (slug === 'solutions') capturedSolutionsSave = payload;
                if (slug === 'contact') capturedContactSave = payload;
                if (slug === 'global-shell') capturedGlobalShellSave = payload;
                if (slug === 'about-us') capturedAboutSaves.push(clone(payload));
                const block = apiBlock(slug);
                block.version += 1;
                block.body_json = payload.body_json;
                blocks[slug] = clone(block);
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

        await clickVisualModule(page, 'solutions', 'overview');
        await switchLanguage(page, 'default');
        if (await page.locator('#visual-editor-content [data-visual-array-action="add"]').count() !== 1) {
            throw new Error('Unlocked arrays must keep default-language structure controls.');
        }
        await switchLanguage(page, 'ar');
        if (await page.locator('#visual-editor-content [data-visual-array-action="add"]').count() !== 1) {
            throw new Error('Unlocked arrays must keep their existing Arabic structure controls.');
        }
        await switchLanguage(page, 'fr');
        if (await page.locator('#visual-editor-content [data-visual-array-action="add"]').count() !== 0) {
            throw new Error('Unlocked arrays must remain structure-locked in Fr patch mode.');
        }

        await clickVisualModule(page, 'about', 'capability');
        await switchLanguage(page, 'default');
        fields = await fieldSnapshot(page);
        assertField(fields, 'capability.kicker', 'Project Delivery');
        assertField(fields, 'capability.title', 'End-to-end capability');
        assertField(fields, 'capability.cards.0.title', 'Engineering');
        assertField(fields, 'capability.cards.0.image.src', 'capability-original.svg');
        const capabilityAsset = page.locator('[data-visual-field="capability.cards.0.image.src"]');
        if (await capabilityAsset.getAttribute('data-visual-sync-dimensions') !== 'true') {
            throw new Error('Capability image field must opt into dimension synchronization.');
        }
        for (const languageKey of ['default', 'ar', 'fr', 'ru']) {
            await switchLanguage(page, languageKey);
            const structureActions = await page.locator('#visual-editor-content [data-visual-array-action]').count();
            if (structureActions !== 0) throw new Error(`Capability structure controls are exposed in ${languageKey}.`);
        }
        await switchLanguage(page, 'default');
        await page.evaluate(function () {
            var button = document.createElement('button');
            button.type = 'button';
            button.setAttribute('data-visual-array-action', 'remove');
            button.setAttribute('data-page', 'about');
            button.setAttribute('data-module', 'capabilityCards');
            button.setAttribute('data-index', '0');
            button.id = 'forced-capability-remove';
            document.querySelector('#visual-editor-content').appendChild(button);
        });
        await page.locator('#forced-capability-remove').evaluate(function (button) { button.click(); });
        if (await page.locator('[data-visual-field="capability.cards.0.title"]').count() !== 1 ||
            await page.locator('[data-visual-field="capability.cards.1.title"]').count() !== 1) {
            throw new Error('Capability array structure changed through a forced mutation event.');
        }

        await switchLanguage(page, 'ar');
        fields = await fieldSnapshot(page);
        assertField(fields, 'capability.cards.0.titleAr');
        assertField(fields, 'capability.cards.0.image.altAr');
        await page.fill('[data-visual-field="capability.cards.0.titleAr"]', 'قدرة هندسية محدثة');
        await page.fill('[data-visual-field="capability.cards.0.image.altAr"]', 'وصف هندسي محدث');
        await page.click('[data-visual-save]');
        await waitForVisualSave(page);
        let savedAbout = capturedAboutSaves[capturedAboutSaves.length - 1].body_json;
        if (savedAbout.capability.cards[0].title !== 'Engineering' || savedAbout.capability.cards[0].titleAr !== 'قدرة هندسية محدثة') {
            throw new Error('Arabic capability save overwrote the neutral title or missed titleAr.');
        }
        if (savedAbout.factory.title !== 'Real production scenes, not stock imagery' || savedAbout.untouchedModule.marker !== 'keep-about-data') {
            throw new Error('Capability save did not preserve factory or unrelated About data.');
        }

        await switchLanguage(page, 'fr');
        fields = await fieldSnapshot(page);
        assertField(fields, 'capability.cardsPatchFr.index_0.titleFr', 'Ingénierie');
        assertField(fields, 'capability.cardsPatchFr.index_0.image.altFr', 'Capacité');
        await page.fill('[data-visual-field="capability.cardsPatchFr.index_0.titleFr"]', 'Ingénierie mise à jour');
        await page.click('[data-visual-save]');
        await waitForVisualSave(page);
        savedAbout = capturedAboutSaves[capturedAboutSaves.length - 1].body_json;
        if (savedAbout.capability.cards[0].title !== 'Engineering' || savedAbout.capability.cardsPatchFr.index_0.titleFr !== 'Ingénierie mise à jour') {
            throw new Error('Fr capability patch save overwrote the neutral card or missed cardsPatchFr.');
        }
        await switchLanguage(page, 'ru');
        fields = await fieldSnapshot(page);
        assertField(fields, 'capability.cardsPatchRu.index_0.titleRu', 'Проектирование');
        assertField(fields, 'capability.cardsPatchRu.index_0.image.altRu', 'Инженерные');

        await switchLanguage(page, 'default');
        const beforePendingSaveCount = capturedAboutSaves.length;
        await selectVisualAsset(page, 'capability.cards.0.image.src', 'slow-good');
        await page.waitForFunction(function () {
            var field = document.querySelector('[data-visual-field="capability.cards.0.image.src"]');
            return field && field.getAttribute('data-visual-dimension-state') === 'pending';
        }, null, { timeout: 3000 });
        if (!(await page.locator('[data-visual-save]').isDisabled())) {
            throw new Error('Visual save must be disabled while image dimensions are pending.');
        }
        await page.locator('[data-visual-save]').evaluate(function (button) {
            button.disabled = false;
            button.click();
        });
        await page.waitForTimeout(120);
        if (capturedAboutSaves.length !== beforePendingSaveCount) {
            throw new Error('A forced save bypassed the pending image dimension guard.');
        }
        await page.waitForFunction(function () {
            var field = document.querySelector('[data-visual-field="capability.cards.0.image.src"]');
            return field && field.getAttribute('data-visual-dimension-state') === 'ready' && field.value.indexOf('dimension-slow') !== -1;
        }, null, { timeout: 5000 });
        await page.click('[data-visual-save]');
        await waitForVisualSave(page);
        savedAbout = capturedAboutSaves[capturedAboutSaves.length - 1].body_json;
        if (savedAbout.capability.cards[0].image.src !== 'test-assets/dimension-slow-240x160.svg' ||
            savedAbout.capability.cards[0].image.width !== 240 ||
            savedAbout.capability.cards[0].image.height !== 160) {
            throw new Error('Capability image save did not persist numeric natural dimensions.');
        }

        await selectVisualAsset(page, 'capability.cards.0.image.src', 'broken');
        await page.waitForFunction(function () {
            var field = document.querySelector('[data-visual-field="capability.cards.0.image.src"]');
            return field && field.getAttribute('data-visual-dimension-state') === 'error';
        }, null, { timeout: 5000 });
        const failedFieldValue = await page.locator('[data-visual-field="capability.cards.0.image.src"]').inputValue();
        if (failedFieldValue !== 'test-assets/dimension-slow-240x160.svg') {
            throw new Error('Failed image dimension read replaced the previously valid source.');
        }
        const beforeFailedSaveCount = capturedAboutSaves.length;
        await page.locator('[data-visual-save]').evaluate(function (button) {
            button.disabled = false;
            button.click();
        });
        await page.waitForTimeout(120);
        if (capturedAboutSaves.length !== beforeFailedSaveCount) {
            throw new Error('A forced save bypassed the image dimension error guard.');
        }
        const capabilityFieldId = await page.locator('[data-visual-field="capability.cards.0.image.src"]').getAttribute('id');
        await page.click(`[data-visual-clear-asset="${capabilityFieldId}"]`);
        await page.click('[data-visual-save]');
        await waitForVisualSave(page);
        savedAbout = capturedAboutSaves[capturedAboutSaves.length - 1].body_json;
        if (savedAbout.capability.cards[0].image.src !== '' ||
            savedAbout.capability.cards[0].image.width !== null ||
            savedAbout.capability.cards[0].image.height !== null) {
            throw new Error('Clearing a synchronized image did not clear src/width/height together.');
        }

        await clickVisualModule(page, 'about', 'factory');
        await switchLanguage(page, 'default');
        fields = await fieldSnapshot(page);
        assertField(fields, 'factory.title', 'Real production scenes');
        assertField(fields, 'factory.images.0.caption', 'Transformer workshop');
        const factoryAsset = page.locator('[data-visual-field="factory.images.0.image.src"]');
        if (await factoryAsset.getAttribute('data-visual-sync-dimensions') !== 'true') {
            throw new Error('Factory image field must opt into dimension synchronization.');
        }
        if (await page.locator('#visual-editor-content [data-visual-array-action]').count() !== 0) {
            throw new Error('Factory structure controls are exposed.');
        }
        await selectVisualAsset(page, 'factory.images.0.image.src', 'factory-good');
        await page.waitForFunction(function () {
            var field = document.querySelector('[data-visual-field="factory.images.0.image.src"]');
            return field && field.getAttribute('data-visual-dimension-state') === 'ready';
        }, null, { timeout: 5000 });
        await page.click('[data-visual-save]');
        await waitForVisualSave(page);
        savedAbout = capturedAboutSaves[capturedAboutSaves.length - 1].body_json;
        if (savedAbout.factory.images[0].image.src !== 'test-assets/dimension-450x300.svg' ||
            savedAbout.factory.images[0].image.width !== 450 ||
            savedAbout.factory.images[0].image.height !== 300) {
            throw new Error('Factory image save did not persist numeric natural dimensions.');
        }
        if (savedAbout.capability.cards.length !== 2 || savedAbout.factory.images.length !== 2) {
            throw new Error('Locked About arrays changed length during editing.');
        }

        await switchLanguage(page, 'fr');
        fields = await fieldSnapshot(page);
        assertField(fields, 'factory.imagesPatchFr.index_0.captionFr', 'Atelier');
        assertField(fields, 'factory.imagesPatchFr.index_0.image.altFr', 'Atelier');
        await switchLanguage(page, 'ru');
        fields = await fieldSnapshot(page);
        assertField(fields, 'factory.imagesPatchRu.index_0.captionRu', 'Цех');
        assertField(fields, 'factory.imagesPatchRu.index_0.image.altRu', 'Цех');

        await page.reload({ waitUntil: 'networkidle' });
        await clickVisualModule(page, 'about', 'factory');
        await switchLanguage(page, 'default');
        fields = await fieldSnapshot(page);
        assertField(fields, 'factory.images.0.image.src', 'dimension-450x300.svg');

        await switchLanguage(page, 'default');
        await clickVisualModule(page, 'contact', 'contactInfo');
        fields = await fieldSnapshot(page);
        assertField(fields, 'email', 'sales@longxiang.test');
        assertField(fields, 'instagram', 'https://www.instagram.com/longxiang.test/');
        assertField(fields, 'youtube', 'https://www.youtube.com/@longxiang-test');
        if (fields.find((item) => item.path === 'instagram').type !== 'url' || fields.find((item) => item.path === 'youtube').type !== 'url') {
            throw new Error('Instagram and YouTube visual fields must use URL inputs.');
        }
        await page.fill('[data-visual-field="instagram"]', 'https://www.instagram.com/longxiang-updated/');
        await page.click('[data-visual-save]');
        await page.waitForFunction(function () { return document.querySelector('#visual-save-status') && document.querySelector('#visual-save-status').textContent.indexOf('保存') === -1; }, null, { timeout: 10000 }).catch(function () {});
        if (!capturedContactSave || capturedContactSave.body_json.instagram !== 'https://www.instagram.com/longxiang-updated/') {
            throw new Error('Contact social URL was not saved to the existing contact content block.');
        }

        await clickVisualModule(page, 'global', 'contactBar');
        fields = await fieldSnapshot(page);
        ['navigation.contactBar.enabled', 'navigation.contactBar.showEmail', 'navigation.contactBar.showInstagram', 'navigation.contactBar.showYouTube'].forEach(function (path) {
            assertField(fields, path);
            if (fields.find((item) => item.path === path).checked !== true) {
                throw new Error(`Legacy global-shell data should default ${path} to enabled.`);
            }
        });
        await page.locator('[data-visual-field="navigation.contactBar.showYouTube"]').uncheck({ force: true });
        await page.click('[data-visual-save]');
        await page.waitForFunction(function () { return document.querySelector('#visual-save-status') && document.querySelector('#visual-save-status').textContent.indexOf('保存') === -1; }, null, { timeout: 10000 }).catch(function () {});
        if (!capturedGlobalShellSave || capturedGlobalShellSave.body_json.navigation.contactBar.showYouTube !== false) {
            throw new Error('Top contact bar toggle was not saved to global-shell.navigation.contactBar.');
        }

        const adminHtml = fs.readFileSync(path.join(ROOT, 'admin', 'index.html'), 'utf8');
        if (!adminHtml.includes(`js/admin.js?v=${ADMIN_CACHE_VERSION}`)) {
            throw new Error(`admin/index.html must load admin.js with cache version ${ADMIN_CACHE_VERSION}.`);
        }

        console.log('admin visual About modules, patch safety, image dimensions, and cache support OK');
    } finally {
        await browser.close();
        server.close();
    }
}

main().catch(function (err) {
    console.error(err);
    process.exit(1);
});
