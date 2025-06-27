// EMERGENCY DATA RECOVERY SCRIPT
// Plak dit in de browser console op tickedify.com

(async function() {
    console.log('🚨 Starting Emergency Data Recovery...');
    
    const userId = 'user_1750506689312_16hqhim0k';
    const lists = ['inbox', 'acties', 'projecten', 'opvolgen', 'afgewerkte-taken',
                   'uitgesteld-wekelijks', 'uitgesteld-maandelijks', 
                   'uitgesteld-3maandelijks', 'uitgesteld-6maandelijks', 
                   'uitgesteld-jaarlijks'];
    
    let allTasks = [];
    let totalFound = 0;
    
    console.log('Scanning all lists...');
    
    for (const list of lists) {
        try {
            const response = await fetch(`/api/lijst/${list}`);
            if (response.ok) {
                const tasks = await response.json();
                console.log(`${list}: ${tasks.length} tasks found`);
                
                if (tasks.length > 0) {
                    tasks.forEach(task => {
                        // Log all tasks regardless of user
                        console.log(`  - ${task.tekst} (user: ${task.user_id || 'NO USER ID'})`);
                        allTasks.push({...task, originalList: list});
                        totalFound++;
                    });
                }
            }
        } catch (error) {
            console.error(`Error checking ${list}:`, error);
        }
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`Total tasks found: ${totalFound}`);
    console.log(`Tasks by user:`);
    
    // Group by user
    const tasksByUser = {};
    allTasks.forEach(task => {
        const user = task.user_id || 'NO_USER';
        if (!tasksByUser[user]) tasksByUser[user] = [];
        tasksByUser[user].push(task);
    });
    
    Object.entries(tasksByUser).forEach(([user, tasks]) => {
        console.log(`\nUser ${user}: ${tasks.length} tasks`);
        tasks.forEach(task => {
            console.log(`  - [${task.originalList}] ${task.tekst}`);
        });
    });
    
    // Check specific debug endpoints
    console.log('\n🔍 Checking debug endpoints...');
    
    try {
        const debugResponse = await fetch('/api/debug/current-user');
        const debugData = await debugResponse.json();
        console.log('Current user session:', debugData);
    } catch (error) {
        console.error('Error checking current user:', error);
    }
    
    // Store in window for manual recovery
    window.RECOVERY_DATA = {
        allTasks,
        tasksByUser,
        userId,
        timestamp: new Date().toISOString()
    };
    
    console.log('\n✅ Recovery scan complete!');
    console.log('Data stored in window.RECOVERY_DATA');
    console.log('To see your tasks, type: window.RECOVERY_DATA.tasksByUser');
    
})();