#!/usr/bin/env node

/**
 * Automatische Deployment Workflow Script
 * Implementeert de verplichte workflow uit CLAUDE.md voor elke code wijziging
 */

// Use global fetch (available in Node.js 18+)
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DeploymentWorkflow {
    constructor() {
        this.baseUrl = 'https://tickedify.com';
        this.maxWaitTime = 600000; // 10 minuten
        this.pollInterval = 15000; // 15 seconden
    }

    async run() {
        try {
            console.log('🚀 Starting Deployment Workflow...');
            
            // 1. Get current version
            const packagePath = path.join(__dirname, 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            const targetVersion = packageJson.version;
            
            console.log(`📦 Target version: ${targetVersion}`);
            
            // 2. Wait for deployment confirmation
            console.log('⏳ Waiting for deployment confirmation...');
            const deployed = await this.waitForDeployment(targetVersion);
            
            if (!deployed) {
                throw new Error('🚨 Deployment timeout - manual verification required');
            }
            
            console.log('✅ Deployment confirmed!');
            
            // 3. Run regression tests
            console.log('🧪 Running regression tests...');
            const regressionResults = await this.runRegressionTests();
            
            // 4. Report results
            this.reportResults(targetVersion, regressionResults);
            
            return regressionResults;
            
        } catch (error) {
            console.error('❌ Deployment workflow failed:', error.message);
            throw error;
        }
    }

    async waitForDeployment(targetVersion, maxWaitTime = this.maxWaitTime) {
        const startTime = Date.now();
        let attempts = 0;
        
        while (Date.now() - startTime < maxWaitTime) {
            attempts++;
            
            try {
                console.log(`🔍 Checking deployment status (attempt ${attempts})...`);
                
                const response = await fetch(`${this.baseUrl}/api/version`);
                if (!response.ok) {
                    console.log(`   ⚠️  API not responding (${response.status})`);
                } else {
                    const data = await response.json();
                    console.log(`   📊 Current version: ${data.version}, target: ${targetVersion}`);
                    
                    if (data.version === targetVersion) {
                        console.log(`   ✅ Version ${targetVersion} is live!`);
                        return true;
                    }
                }
            } catch (error) {
                console.log(`   ⚠️  Connection error: ${error.message}`);
            }
            
            // Wait before next attempt
            console.log(`   ⏳ Waiting ${this.pollInterval/1000}s before next check...`);
            await this.sleep(this.pollInterval);
        }
        
        return false;
    }

    async runRegressionTests() {
        try {
            const response = await fetch(`${this.baseUrl}/api/test/run-regression`);
            
            if (!response.ok) {
                throw new Error(`Test API responded with ${response.status}: ${response.statusText}`);
            }
            
            const results = await response.json();
            return results;
            
        } catch (error) {
            console.error('❌ Failed to run regression tests:', error.message);
            return {
                total_tests: 0,
                passed: 0,
                failed: 1,
                duration_ms: 0,
                cleanup_successful: false,
                error: error.message
            };
        }
    }

    reportResults(version, results) {
        console.log('\n📋 DEPLOYMENT WORKFLOW RESULTS');
        console.log('================================');
        console.log(`🏷️  Version: ${version}`);
        console.log(`📊 Total Tests: ${results.total_tests}`);
        console.log(`✅ Passed: ${results.passed}`);
        console.log(`❌ Failed: ${results.failed}`);
        console.log(`⏱️  Duration: ${results.duration_ms}ms`);
        console.log(`🧹 Cleanup: ${results.cleanup_successful ? '✅' : '❌'}`);
        
        if (results.failed > 0) {
            console.log('\n🚨 REGRESSION DETECTED!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
            
            if (results.results) {
                const failedTests = results.results.filter(t => !t.passed);
                failedTests.forEach(test => {
                    console.log(`❌ ${test.name}: ${test.details || 'No details'}`);
                });
            }
            
            console.log('\n⚠️  Action required: Fix failing tests before proceeding');
            process.exit(1);
        } else {
            console.log('\n🎉 ALL TESTS PASSED!');
            console.log('━━━━━━━━━━━━━━━━━━━━━');
            console.log(`✅ Deployment ${version} verified - system stable`);
            console.log(`🔗 Test Dashboard: ${this.baseUrl}/admin/tests`);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Utility functies voor Claude
class ClaudeWorkflowHelpers {
    static async updateVersionAndCommit(changeDescription) {
        try {
            console.log('🔧 Updating version and committing changes...');
            
            // 1. Update version number
            const packagePath = path.join(__dirname, 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            const currentVersion = packageJson.version;
            const [major, minor, patch] = currentVersion.split('.').map(Number);
            const newVersion = `${major}.${minor}.${patch + 1}`;
            
            packageJson.version = newVersion;
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
            
            console.log(`📦 Version updated: ${currentVersion} → ${newVersion}`);
            
            // 2. Git commit and push
            execSync('git add .', { stdio: 'inherit' });
            
            const commitMessage = `$(cat <<'EOF'
${changeDescription}

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)`;
            
            execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
            execSync('git push', { stdio: 'inherit' });
            
            console.log(`✅ Changes committed and pushed with version ${newVersion}`);
            return newVersion;
            
        } catch (error) {
            console.error('❌ Failed to update version and commit:', error.message);
            throw error;
        }
    }

    static async runFullWorkflow(changeDescription) {
        try {
            console.log('🚀 Starting Claude Deployment Workflow...');
            
            // 1. Update version and commit
            const newVersion = await this.updateVersionAndCommit(changeDescription);
            
            // 2. Run deployment workflow
            const workflow = new DeploymentWorkflow();
            const results = await workflow.run();
            
            console.log('\n🎯 WORKFLOW COMPLETED SUCCESSFULLY!');
            return { version: newVersion, testResults: results };
            
        } catch (error) {
            console.error('🚨 WORKFLOW FAILED:', error.message);
            throw error;
        }
    }
}

// Export voor gebruik door Claude of andere scripts
module.exports = {
    DeploymentWorkflow,
    ClaudeWorkflowHelpers
};

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    
    if (command === 'check-deployment') {
        const workflow = new DeploymentWorkflow();
        workflow.run().catch(error => {
            console.error('Workflow failed:', error.message);
            process.exit(1);
        });
    } else if (command === 'full-workflow') {
        const description = args[1] || '🔧 Auto-deployment via workflow script';
        ClaudeWorkflowHelpers.runFullWorkflow(description).catch(error => {
            console.error('Full workflow failed:', error.message);
            process.exit(1);
        });
    } else {
        console.log('Usage:');
        console.log('  node deployment-workflow.js check-deployment');
        console.log('  node deployment-workflow.js full-workflow "Change description"');
    }
}