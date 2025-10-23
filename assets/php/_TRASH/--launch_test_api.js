const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { ServiceBuilder } = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

// Importation des données de test API
const { testScenarios, testData, stepTemplates, waitForElement } = require('./campagne_tests_api');

// Créer un dossier pour les logs API
const logsDir = path.join(__dirname, 'api-logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Fonction pour générer un nom de fichier de log
function generateLogFileName(testCode, stepNumber, stepDescription) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
    const cleanDescription = stepDescription
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 30);

    return `${testCode}_step${stepNumber}_${cleanDescription}_${timestamp}.json`;
}

// Fonction pour sauvegarder les réponses API
async function saveApiResponse(testCode, stepNumber, stepDescription, response) {
    try {
        const filename = generateLogFileName(testCode, stepNumber, stepDescription);
        const filepath = path.join(logsDir, filename);

        const logData = {
            timestamp: new Date().toISOString(),
            testCode,
            stepNumber,
            stepDescription,
            response: {
                status: response.status,
                success: response.success,
                error: response.error,
                data: response.data
            }
        };

        fs.writeFileSync(filepath, JSON.stringify(logData, null, 2));
        console.log(`📄 Log API sauvegardé: ${filename}`);
        return filepath;
    } catch (error) {
        console.error("Impossible de sauvegarder le log API:", error);
        return null;
    }
}

// Fonction pour exécuter un scénario de test API
async function runTestScenario(driver, scenario) {
    console.log(`\n=== DÉBUT DU SCÉNARIO API: ${scenario.code} - ${scenario.name} ===`);

    let success = true;
    const results = [];

    for (let i = 0; i < scenario.steps.length; i++) {
        const step = scenario.steps[i];

        try {
            console.log(`\n🔹 Étape ${i + 1}: ${step.description}`);

            // Exécuter l'étape
            const result = await step.action(driver);

            // Sauvegarder le résultat si c'est une réponse API
            if (result && typeof result === 'object') {
                await saveApiResponse(scenario.code, i + 1, step.description, {
                    success: true,
                    data: result
                });
            }

            results.push({
                step: i + 1,
                description: step.description,
                status: "SUCCESS",
                data: result
            });

            console.log(`✅ Étape ${i + 1} terminée avec succès`);

        } catch (error) {
            console.error(`❌ Échec de l'étape ${i + 1}: ${error.message}`);

            // Sauvegarder l'erreur
            await saveApiResponse(scenario.code, i + 1, step.description, {
                success: false,
                error: error.message
            });

            results.push({
                step: i + 1,
                description: step.description,
                status: "FAILED",
                error: error.message
            });

            success = false;
            break;
        }
    }

    console.log(`=== FIN DU SCÉNARIO API: ${scenario.code} - ${scenario.name} ===`);
    return { success, results };
}

// Fonction principale pour exécuter tous les tests API
async function runAllApiTests() {
    let driver;
    const globalResults = [];

    try {
        console.log("🚀 DÉMARRAGE DES TESTS API");
        console.log(`URL de base: ${testData.apiBaseURL}`);
        console.log(`Endpoint testé: ${testData.endpoints.getEventData}`);
        console.log(`Nombre de scénarios: ${testScenarios.length}`);

        // Créer un driver minimal pour les tests API (peut être headless)
        let options = new chrome.Options();
        options.addArguments('--headless'); // Mode sans interface
        options.addArguments('--no-sandbox');
        options.addArguments('--disable-dev-shm-usage');

        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        for (let i = 0; i < testScenarios.length; i++) {
            const scenario = testScenarios[i];

            console.log(`\n📋 Exécution du scénario ${i + 1}/${testScenarios.length}`);

            const result = await runTestScenario(driver, scenario);
            globalResults.push({
                scenario: scenario.name,
                code: scenario.code,
                ...result
            });
        }

        // Résumé détaillé
        console.log("\n📊 RÉSUMÉ DÉTAILLÉ DES TESTS API");
        console.log("=".repeat(60));

        let totalSuccess = 0;
        globalResults.forEach((result, index) => {
            const status = result.success ? "✓ SUCCÈS" : "❌ ÉCHEC";
            console.log(`${index + 1}. ${result.code} - ${result.scenario} - ${status}`);

            if (!result.success) {
                console.log("   Échecs détaillés:");
                result.results.forEach(stepResult => {
                    if (stepResult.status === "FAILED") {
                        console.log(`     - Étape ${stepResult.step}: ${stepResult.description}`);
                        console.log(`       Erreur: ${stepResult.error}`);
                    }
                });
            }

            if (result.success) totalSuccess++;
        });

        console.log(`\n📈 STATISTIQUES: ${totalSuccess}/${globalResults.length} scénarios API réussis`);

        // Lister les logs générés
        console.log("\n📄 LOGS API GÉNÉRÉS:");
        try {
            const logFiles = fs.readdirSync(logsDir);
            if (logFiles.length === 0) {
                console.log("   Aucun log généré");
            } else {
                logFiles.forEach(file => {
                    console.log(`   - ${file}`);
                });
            }
        } catch (error) {
            console.log("   Impossible de lire le dossier des logs API");
        }

    } catch (error) {
        console.error("❌ ERREUR GLOBALE lors de l'exécution des tests API:", error);
    } finally {
        if (driver) {
            await driver.quit();
            console.log("\n🔚 Driver fermé");
        }
    }

    return globalResults;
}

// Exécution
runAllApiTests().then(results => {
    console.log("\n🎯 EXÉCUTION DES TESTS API TERMINÉE");

    // Générer un rapport JSON
    const report = {
        timestamp: new Date().toISOString(),
        apiEndpoint: testData.endpoints.getEventData,
        totalTests: results.length,
        passedTests: results.filter(r => r.success).length,
        failedTests: results.filter(r => !r.success).length,
        details: results
    };

    const reportPath = path.join(__dirname, 'api-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Rapport API JSON généré: ${reportPath}`);

    // GÉNÉRER LE RAPPORT HTML AUTOMATIQUEMENT
    console.log("\n📊 Génération du rapport HTML...");
    try {
        const { generateHtmlReport } = require('./generate-html-report');
        const htmlReportPath = generateHtmlReport();

        if (htmlReportPath) {
            console.log(`\n🎉 RAPPORT HTML PRÊT!`);
            console.log(`📍 Fichier: ${htmlReportPath}`);
            console.log(`🔗 Ouvrez ce fichier dans votre navigateur pour voir le rapport complet`);
        }
    } catch (error) {
        console.error('❌ Erreur lors de la génération du rapport HTML:', error);
    }
});