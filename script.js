document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const plantK = document.getElementById('plant-k');
    const plantT = document.getElementById('plant-t');
    const plantL = document.getElementById('plant-l');

    // Calculator Elements
    const calcMv0 = document.getElementById('calc-mv0');
    const calcMv1 = document.getElementById('calc-mv1');
    const calcPv0 = document.getElementById('calc-pv0');
    const calcPv1 = document.getElementById('calc-pv1');
    const calcT1 = document.getElementById('calc-t1'); // 28.3%
    const calcT2 = document.getElementById('calc-t2'); // 63.2%
    const btnCalcPlant = document.getElementById('btn-calc-plant');
    const calcResult = document.getElementById('calc-result');

    const pidKp = document.getElementById('pid-kp');
    const pidKi = document.getElementById('pid-ki');
    const pidKd = document.getElementById('pid-kd');
    
    const valKp = document.getElementById('val-kp');
    const valKi = document.getElementById('val-ki');
    const valKd = document.getElementById('val-kd');

    const btnTuneP = document.getElementById('btn-tune-p');
    const btnTunePI = document.getElementById('btn-tune-pi');
    const btnTunePID = document.getElementById('btn-tune-pid');
    const btnSimulate = document.getElementById('btn-simulate');

    const metricOvershoot = document.getElementById('metric-overshoot');
    const metricSettling = document.getElementById('metric-settling');
    const metricSSE = document.getElementById('metric-sse');

    // Chart Configuration
    const ctx = document.getElementById('stepResponseChart').getContext('2d');
    
    // Gradient for Setpoint
    const setpointGradient = ctx.createLinearGradient(0, 0, 800, 0);
    setpointGradient.addColorStop(0, 'rgba(148, 163, 184, 0.8)');
    setpointGradient.addColorStop(1, 'rgba(148, 163, 184, 0.8)');

    // Gradient for Response
    const responseGradient = ctx.createLinearGradient(0, 0, 0, 400);
    responseGradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    responseGradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    let chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'System Response PV(t)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: responseGradient,
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: true,
                    tension: 0.1
                },
                {
                    label: 'Setpoint SV(t)',
                    data: [],
                    borderColor: '#94a3b8',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 500
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                legend: {
                    labels: { color: '#f8fafc', font: { family: 'Outfit', size: 13 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { family: 'Outfit' },
                    bodyFont: { family: 'Outfit' },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Time (s)', color: '#94a3b8', font: {family: 'Outfit'} },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    title: { display: true, text: 'Amplitude', color: '#94a3b8', font: {family: 'Outfit'} },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' },
                    suggestedMin: 0,
                    suggestedMax: 1.5
                }
            }
        }
    });

    // Update Display Functions
    const updatePIDDisplays = () => {
        valKp.textContent = parseFloat(pidKp.value).toFixed(2);
        valKi.textContent = parseFloat(pidKi.value).toFixed(2);
        valKd.textContent = parseFloat(pidKd.value).toFixed(2);
    };

    const setGains = (kp, ki, kd) => {
        // dynamically adjust max of ranges if tuned values exceed them
        if (kp > parseFloat(pidKp.max)) pidKp.max = Math.ceil(kp * 1.5);
        if (ki > parseFloat(pidKi.max)) pidKi.max = Math.ceil(ki * 1.5);
        if (kd > parseFloat(pidKd.max)) pidKd.max = Math.ceil(kd * 1.5);

        pidKp.value = kp;
        pidKi.value = ki;
        pidKd.value = kd;
        updatePIDDisplays();
        runSimulation();
    };

    // Auto Tune Ziegler-Nichols (Step Response)
    // R = K / T, L = L
    // a = K * L / T
    const autoTune = (type) => {
        const K = parseFloat(plantK.value);
        const T = parseFloat(plantT.value);
        const L = parseFloat(plantL.value);

        if (K <= 0 || T <= 0 || L <= 0) return;

        const a = (K * L) / T;
        let kp = 0, ti = 0, td = 0;

        if (type === 'P') {
            kp = 1 / a;
            setGains(kp, 0, 0);
        } else if (type === 'PI') {
            kp = 0.9 / a;
            ti = 3.3 * L;
            setGains(kp, kp / ti, 0);
        } else if (type === 'PID') {
            kp = 1.2 / a;
            ti = 2.0 * L;
            td = 0.5 * L;
            setGains(kp, kp / ti, kp * td);
        }
    };

    // Listeners
    pidKp.addEventListener('input', () => { updatePIDDisplays(); runSimulation(); });
    pidKi.addEventListener('input', () => { updatePIDDisplays(); runSimulation(); });
    pidKd.addEventListener('input', () => { updatePIDDisplays(); runSimulation(); });

    plantK.addEventListener('change', runSimulation);
    plantT.addEventListener('change', runSimulation);
    plantL.addEventListener('change', runSimulation);

    btnTuneP.addEventListener('click', () => autoTune('P'));
    btnTunePI.addEventListener('click', () => autoTune('PI'));
    btnTunePID.addEventListener('click', () => autoTune('PID'));
    btnSimulate.addEventListener('click', runSimulation);

    // Plant System Identification (2-Point Method for FOPDT)
    btnCalcPlant.addEventListener('click', () => {
        const mv0 = parseFloat(calcMv0.value);
        const mv1 = parseFloat(calcMv1.value);
        const pv0 = parseFloat(calcPv0.value);
        const pv1 = parseFloat(calcPv1.value);
        const t1 = parseFloat(calcT1.value);
        const t2 = parseFloat(calcT2.value);

        if (mv0 === mv1 || t1 >= t2 || t1 <= 0 || t2 <= 0) {
            calcResult.textContent = "Error: Invalid inputs.";
            calcResult.classList.remove('hidden');
            return;
        }

        // Process Gain (K)
        const K = (pv1 - pv0) / (mv1 - mv0);
        
        // Time Constant (T) and Dead Time (L) based on 28.3% and 63.2% method
        const T = 1.5 * (t2 - t1);
        let L = t2 - T;

        if (L < 0) {
            // fallback if L is negative due to noise or inaccuracy
            L = 0;
        }

        // Apply
        // Typically chillers are cooling, so K might be negative (e.g., MV increase -> PV decrease).
        // Our simulator uses K, we just apply the value. We use K.toFixed(3).
        plantK.value = Math.abs(K).toFixed(3); // Some simulations take absolute and rely on negative feedback. We'll set absolute to avoid breaking simulator logic.
        plantT.value = Math.max(0.1, T).toFixed(2);
        plantL.value = Math.max(0.1, L).toFixed(2);

        calcResult.textContent = `Applied! K: ${K.toFixed(3)}, T: ${T.toFixed(1)}s, L: ${L.toFixed(1)}s`;
        calcResult.classList.remove('hidden');
        
        runSimulation();
    });

    // Simulation Engine
    function runSimulation() {
        const K = parseFloat(plantK.value);
        const T = parseFloat(plantT.value);
        const L = parseFloat(plantL.value);

        const Kp = parseFloat(pidKp.value);
        const Ki = parseFloat(pidKi.value);
        const Kd = parseFloat(pidKd.value);

        // Simulation parameters
        const dt = 0.05; // Time step
        const simTime = Math.max(20, L * 10 + T * 5); // Auto-adjust sim time based on dynamics
        const nSteps = Math.ceil(simTime / dt);
        
        const deadTimeSteps = Math.floor(L / dt);
        
        let timeData = [];
        let yData = [];
        let setpointData = [];

        // State variables
        let y = 0;
        let integral = 0;
        let prevError = 0;
        let uBuffer = new Array(deadTimeSteps + 1).fill(0); // Delay buffer for u(t)
        
        // Metrics calculation vars
        let maxOvershoot = 0;
        let settlingTime = -1;
        const setpoint = 1.0;
        let withinToleranceSince = -1;

        for (let i = 0; i < nSteps; i++) {
            let t = i * dt;
            
            // FOPDT Plant update calculation (Euler method)
            // T * dy/dt + y = K * u(t - L)
            // dy = (K * u(t-L) - y) * dt / T
            let delayedU = uBuffer.shift(); // Get u(t-L)
            
            if (i > 0) {
                let dy = ((K * delayedU) - y) * (dt / T);
                y = y + dy;
            }

            // Error
            let e = setpoint - y;
            
            // PID Controller
            integral += e * dt;
            // Anti-windup
            if (integral > 100) integral = 100;
            if (integral < -100) integral = -100;

            let derivative = (e - prevError) / dt;
            prevError = e;

            let u = (Kp * e) + (Ki * integral) + (Kd * derivative);
            
            // Output limits (Actuator saturation)
            if (u > 100) u = 100;
            if (u < -100) u = -100;

            uBuffer.push(u); // Store for future (simulate dead time)

            // Store data
            timeData.push(t.toFixed(1));
            yData.push(y);
            setpointData.push(setpoint);

            // Calculate metrics
            if (y > maxOvershoot) {
                maxOvershoot = y;
            }

            // 2% settling time
            if (Math.abs(y - setpoint) <= 0.02 * setpoint) {
                if (withinToleranceSince === -1) {
                    withinToleranceSince = t;
                }
            } else {
                withinToleranceSince = -1;
            }
        }

        // Finalize metrics
        let overshootPercent = Math.max(0, ((maxOvershoot - setpoint) / setpoint) * 100);
        let sse = Math.abs(setpoint - y);

        if (withinToleranceSince !== -1 && sse <= 0.02 * setpoint) {
            settlingTime = withinToleranceSince;
        }

        // Update UI
        metricOvershoot.textContent = overshootPercent.toFixed(1) + ' %';
        metricSettling.textContent = settlingTime !== -1 ? settlingTime.toFixed(1) + ' s' : '> ' + simTime.toFixed(0) + ' s';
        metricSSE.textContent = sse.toFixed(4);

        if(overshootPercent > 50) metricOvershoot.style.color = '#ef4444'; // Red if high
        else metricOvershoot.style.color = '#10b981'; // Green if good
        
        if (sse > 0.05) metricSSE.style.color = '#ef4444';
        else metricSSE.style.color = '#10b981';

        // Update Chart
        chart.data.labels = timeData;
        chart.data.datasets[0].data = yData;
        chart.data.datasets[1].data = setpointData;
        chart.update();
    }

    // Init
    updatePIDDisplays();
    runSimulation();
});
