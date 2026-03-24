/**
 * script.js
 * Logic and animations for Election Algorithms (Ring & Bully)
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- TAB SWITCHING LOGIC ---
    const tabRing = document.getElementById('tab-ring');
    const tabBully = document.getElementById('tab-bully');
    const panelRing = document.getElementById('panel-ring');
    const panelBully = document.getElementById('panel-bully');

    tabRing.addEventListener('change', () => {
        if (tabRing.checked) {
            panelRing.classList.add('active');
            panelBully.classList.remove('active');
        }
    });

    tabBully.addEventListener('change', () => {
        if (tabBully.checked) {
            panelBully.classList.add('active');
            panelRing.classList.remove('active');
        }
    });

    // --- UTILITIES ---
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function logStep(logId, message, type = 'normal') {
        const logList = document.getElementById(logId);
        const li = document.createElement('li');
        li.innerHTML = message;
        if (type === 'error') li.style.color = '#e53e3e';
        if (type === 'success') li.style.color = '#38a169';
        
        logList.appendChild(li);
        logList.parentElement.scrollTop = logList.parentElement.scrollHeight;
    }

    function clearLog(logId) {
        document.getElementById(logId).innerHTML = '';
        const statusMsg = document.querySelector(`#${logId.replace('log-', 'expl-')} .status-msg`);
        if (statusMsg) statusMsg.style.display = 'none';
    }

    function createNodeElement(id, x, y, containerId) {
        const container = document.getElementById(containerId);
        const node = document.createElement('div');
        node.className = 'node';
        node.id = `${containerId}-node-${id}`;
        node.textContent = id;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.dataset.id = id;
        container.appendChild(node);
        return node;
    }

    async function sendAnimatedMessage(containerId, fromNodeId, toNodeId, text, msgClass = '') {
        const container = document.getElementById(containerId);
        const fromNode = document.getElementById(`${containerId}-node-${fromNodeId}`);
        const toNode = document.getElementById(`${containerId}-node-${toNodeId}`);
        
        if (!fromNode || !toNode) return;

        const fromRect = fromNode.getBoundingClientRect();
        const toRect = toNode.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const startX = fromRect.left - containerRect.left + 25; // 25 is half node width
        const startY = fromRect.top - containerRect.top + 25;
        const endX = toRect.left - containerRect.left + 25;
        const endY = toRect.top - containerRect.top + 25;

        const msg = document.createElement('div');
        msg.className = `message ${msgClass}`;
        msg.textContent = text;
        msg.style.left = `${startX}px`;
        msg.style.top = `${startY}px`;
        msg.style.opacity = '1';
        
        // Initial tiny offset to center the message pill roughly
        msg.style.transform = `translate(-50%, -50%)`;
        container.appendChild(msg);

        // Force reflow
        msg.getBoundingClientRect();

        // Animate to destination
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        msg.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;

        // Wait for animation to finish
        await delay(1000);
        
        msg.style.opacity = '0';
        await delay(300); // fade out
        msg.remove();
        
        // flash receiver
        toNode.style.transform = 'scale(1.1)';
        toNode.style.boxShadow = '0 0 10px rgba(66, 153, 225, 0.8)';
        setTimeout(() => {
            if(!toNode.classList.contains('crashed')) {
                toNode.style.transform = 'scale(1)';
            }
            toNode.style.boxShadow = '';
        }, 300);
    }

    // --- RING ALGORITHM DEMO ---
    let ringIsRunning = false;
    
    function setupRingCanvas() {
        const canvas = document.getElementById('canvas-ring');
        canvas.innerHTML = '';
        // Circular layout for 5 nodes
        const radius = 100;
        const centerX = canvas.clientWidth / 2;
        const centerY = canvas.clientHeight / 2;
        
        for (let i = 1; i <= 5; i++) {
            // angle such that 1 is at top
            const angle = (i * 2 * Math.PI / 5) - (Math.PI / 2) - (2*Math.PI/5);
            // i=1 -> top, i=2 -> right top...
            
            const x = centerX + radius * Math.cos(angle) - 25; // -25 offset center
            const y = centerY + radius * Math.sin(angle) - 25;
            
            const node = createNodeElement(i, x, y, 'canvas-ring');
            if (i === 5) {
                node.classList.add('coordinator');
            }
        }
    }

    const startRingBtn = document.getElementById('btn-start-ring');
    const resetRingBtn = document.getElementById('btn-reset-ring');

    startRingBtn.addEventListener('click', async () => {
        if (ringIsRunning) return;
        ringIsRunning = true;
        startRingBtn.disabled = true;
        
        clearLog('log-ring');
        setupRingCanvas();
        
        logStep('log-ring', 'Current coordinator is <strong>Node 5</strong>.');
        await delay(1000);

        // Crash Node 5
        const node5 = document.getElementById('canvas-ring-node-5');
        node5.classList.remove('coordinator');
        node5.classList.add('crashed');
        logStep('log-ring', '<strong>Node 5</strong> has crashed!', 'error');
        await delay(1500);

        // Node 2 detects
        const node2 = document.getElementById('canvas-ring-node-2');
        node2.classList.add('active-election');
        logStep('log-ring', '<strong>Node 2</strong> detects the crash and starts an election.');
        await delay(1500);

        // Ring passing 2 -> 3 -> 4 -> 1 -> 2
        // We skip 5 because it's crashed (usually 4 sends to 1)
        const path = [
            { from: 2, to: 3, list: [2] },
            { from: 3, to: 4, list: [2, 3] },
            { from: 4, to: 1, list: [2, 3, 4] }, // Skips 5
            { from: 1, to: 2, list: [2, 3, 4, 1] }
        ];

        for (const step of path) {
            logStep('log-ring', `<strong>Node ${step.from}</strong> sends ELECTION to <strong>Node ${step.to}</strong>. List: [${step.list.join(', ')}]`);
            await sendAnimatedMessage('canvas-ring', step.from, step.to, `ELECTION[${step.list.join(',')}]`);
            document.getElementById(`canvas-ring-node-${step.from}`).classList.remove('active-election');
            document.getElementById(`canvas-ring-node-${step.to}`).classList.add('active-election');
            await delay(500);
        }

        // Node 2 discovers the list
        logStep('log-ring', '<strong>Node 2</strong> receives its own ELECTION message.');
        logStep('log-ring', '<strong>Node 2</strong> examines list <code>[2, 3, 4, 1]</code> and selects highest ID <strong>4</strong>.');
        document.getElementById('canvas-ring-node-2').classList.remove('active-election');
        
        await delay(1500);
        
        // Node 2 announces Node 4
        const coordPath = [
            { from: 2, to: 3 },
            { from: 3, to: 4 },
            { from: 4, to: 1 }
        ];
        
        for (const step of coordPath) {
            logStep('log-ring', `<strong>Node ${step.from}</strong> forwards COORDINATOR(4) to <strong>Node ${step.to}</strong>.`, 'success');
            await sendAnimatedMessage('canvas-ring', step.from, step.to, `COORD(4)`, 'coordinator-msg');
            if (step.to === 4) {
                 document.getElementById('canvas-ring-node-4').classList.add('coordinator');
                 logStep('log-ring', '<strong>Node 4</strong> is crowned Coordinator!', 'success');
            }
            await delay(300);
        }

        logStep('log-ring', '<br><strong>Election Complete! Node 4 is the new Coordinator.</strong>', 'success');
        ringIsRunning = false;
        startRingBtn.disabled = false;
    });

    resetRingBtn.addEventListener('click', () => {
        ringIsRunning = false;
        startRingBtn.disabled = false;
        clearLog('log-ring');
        setupRingCanvas();
        document.querySelector(`#expl-ring .status-msg`).style.display = 'block';
    });


    // --- BULLY ALGORITHM DEMO ---
    let bullyIsRunning = false;
    
    function setupBullyCanvas() {
        const canvas = document.getElementById('canvas-bully');
        canvas.innerHTML = '';
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        // Arrange sequentially horizontally
        for (let i = 1; i <= 5; i++) {
            const x = (width / 6) * i - 25;
            const y = height / 2 - 25;
            const node = createNodeElement(i, x, y, 'canvas-bully');
            if (i === 5) {
                node.classList.add('coordinator');
            }
        }
    }

    const startBullyBtn = document.getElementById('btn-start-bully');
    const resetBullyBtn = document.getElementById('btn-reset-bully');

    startBullyBtn.addEventListener('click', async () => {
        if (bullyIsRunning) return;
        bullyIsRunning = true;
        startBullyBtn.disabled = true;

        clearLog('log-bully');
        setupBullyCanvas();
        
        logStep('log-bully', 'Current coordinator is <strong>Node 5</strong>.');
        await delay(1000);

        // Crash Node 5
        const node5 = document.getElementById('canvas-bully-node-5');
        node5.classList.remove('coordinator');
        node5.classList.add('crashed');
        logStep('log-bully', '<strong>Node 5</strong> has crashed!', 'error');
        await delay(1500);

        // Node 2 detects
        const node2 = document.getElementById('canvas-bully-node-2');
        node2.classList.add('active-election');
        logStep('log-bully', '<strong>Node 2</strong> detects crash and sends ELECTION to nodes <strong>3, 4, 5</strong>.');
        
        // 2 sends to 3,4,5
        await Promise.all([
            sendAnimatedMessage('canvas-bully', 2, 3, 'ELECTION'),
            sendAnimatedMessage('canvas-bully', 2, 4, 'ELECTION'),
            sendAnimatedMessage('canvas-bully', 2, 5, 'ELECTION') // to crashed node
        ]);

        node2.classList.remove('active-election');
        await delay(500);

        // 3 and 4 respond OK
        logStep('log-bully', 'Nodes <strong>3 & 4</strong> respond <code>OK</code> to Node 2. Node 2 drops out.');
        await Promise.all([
            sendAnimatedMessage('canvas-bully', 3, 2, 'OK', 'success'),
            sendAnimatedMessage('canvas-bully', 4, 2, 'OK', 'success')
        ]);
        
        await delay(1000);

        // 3 sends to 4, 5. 4 sends to 5.
        logStep('log-bully', '<strong>Node 3</strong> sends ELECTION to 4, 5. <strong>Node 4</strong> sends ELECTION to 5.');
        document.getElementById('canvas-bully-node-3').classList.add('active-election');
        document.getElementById('canvas-bully-node-4').classList.add('active-election');
        
        await Promise.all([
            sendAnimatedMessage('canvas-bully', 3, 4, 'ELECTION'),
            sendAnimatedMessage('canvas-bully', 3, 5, 'ELECTION'),
            sendAnimatedMessage('canvas-bully', 4, 5, 'ELECTION')
        ]);

        document.getElementById('canvas-bully-node-3').classList.remove('active-election');
        
        await delay(500);

        // 4 responds OK to 3
        logStep('log-bully', 'Node <strong>4</strong> responds <code>OK</code> to Node 3. Node 3 drops out.');
        await sendAnimatedMessage('canvas-bully', 4, 3, 'OK', 'success');

        await delay(1000);

        // 4 waits for 5
        logStep('log-bully', 'Node <strong>4</strong> waits for response from Node 5... Timeout occurs.');
        document.getElementById('canvas-bully-node-4').classList.remove('active-election');
        await delay(1500);

        // 4 becomes coordinator and broadcasts
        document.getElementById('canvas-bully-node-4').classList.add('coordinator');
        logStep('log-bully', 'Node <strong>4</strong> crowns itself Coordinator and broadcasts to lower nodes.', 'success');

        await Promise.all([
            sendAnimatedMessage('canvas-bully', 4, 1, 'COORD(4)', 'coordinator-msg'),
            sendAnimatedMessage('canvas-bully', 4, 2, 'COORD(4)', 'coordinator-msg'),
            sendAnimatedMessage('canvas-bully', 4, 3, 'COORD(4)', 'coordinator-msg')
        ]);

        logStep('log-bully', '<br><strong>Election Complete! Node 4 is the new Coordinator.</strong>', 'success');
        
        bullyIsRunning = false;
        startBullyBtn.disabled = false;
    });

    resetBullyBtn.addEventListener('click', () => {
        bullyIsRunning = false;
        startBullyBtn.disabled = false;
        clearLog('log-bully');
        setupBullyCanvas();
        document.querySelector(`#expl-bully .status-msg`).style.display = 'block';
    });

    // Initialize layout on load and window resize
    setupRingCanvas();
    setupBullyCanvas();
    window.addEventListener('resize', () => {
        setupRingCanvas();
        setupBullyCanvas();
    });
    
    // Quick delay after font-load to ensure correct positions
    setTimeout(() => {
        setupRingCanvas();
        setupBullyCanvas();
    }, 500);
});
