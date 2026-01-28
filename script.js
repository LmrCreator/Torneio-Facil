// --- ESTADO GLOBAL ---
let data = {
    config: { name: '', type: 'futebol', format: 'league', rules: '' },
    teams: [], // {id, name, players: []}
    matches: [], // {id, round, teamA, teamB, scoreA, scoreB, played, events: []}
    feed: [] // {date, text}
};

let currentMatchId = null;

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderAll();
});

// --- SISTEMA DE ABAS ---
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sidebar li').forEach(l => l.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    // Highlight sidebar (simples)
    event.currentTarget.classList.add('active');
}

// --- PERSISTÊNCIA DE DADOS ---
function saveData() {
    localStorage.setItem('arenaFutData', JSON.stringify(data));
    renderAll();
}

function loadData() {
    const saved = localStorage.getItem('arenaFutData');
    if (saved) {
        data = JSON.parse(saved);
        document.getElementById('tourneyName').value = data.config.name;
        document.getElementById('tourneyType').value = data.config.type;
        document.getElementById('rulesText').value = data.config.rules || '';
    }
}

function resetData() {
    if(confirm("Tem certeza? Isso apagará todo o campeonato.")){
        localStorage.removeItem('arenaFutData');
        location.reload();
    }
}

// --- I. CONFIGURAÇÃO ---
function initTournament() {
    data.config.name = document.getElementById('tourneyName').value;
    data.config.type = document.getElementById('tourneyType').value;
    data.config.format = document.getElementById('tourneyFormat').value;
    alert('Campeonato configurado com sucesso!');
    saveData();
    addToFeed(`Campeonato "${data.config.name}" iniciado!`);
}

function saveRules() {
    data.config.rules = document.getElementById('rulesText').value;
    saveData();
    alert('Regulamento atualizado.');
}

// --- II. GESTÃO DE TIMES ---
function addTeam() {
    const name = document.getElementById('newTeamName').value;
    if (!name) return alert('Digite um nome');
    
    const newTeam = {
        id: Date.now(),
        name: name,
        players: [] // Futuro: Adicionar jogadores aqui
    };
    
    // Simulação rápida de jogadores para estatísticas
    for(let i=1; i<=5; i++) {
        newTeam.players.push({id: Date.now()+i, name: `Jogador ${i} (${name})`, goals: 0, yellow: 0, red: 0});
    }

    data.teams.push(newTeam);
    document.getElementById('newTeamName').value = '';
    closeModal('teamModal');
    saveData();
    addToFeed(`Nova equipe registrada: ${name}`);
}

// --- III. GESTÃO DE JOGOS ---
function generateFixture() {
    if (data.teams.length < 2) return alert('Precisa de pelo menos 2 times');
    
    // Algoritmo Round Robin Simples (Ida)
    data.matches = [];
    const teams = [...data.teams];
    if (teams.length % 2 !== 0) teams.push({id: 'bye', name: 'Folga'}); // Dummy team for odd numbers
    
    const totalRounds = teams.length - 1;
    const half = teams.length / 2;

    let matchCount = 0;
    for (let round = 0; round < totalRounds; round++) {
        for (let i = 0; i < half; i++) {
            const teamA = teams[i];
            const teamB = teams[teams.length - 1 - i];
            
            if (teamA.id !== 'bye' && teamB.id !== 'bye') {
                data.matches.push({
                    id: ++matchCount,
                    round: round + 1,
                    teamA: teamA.id,
                    teamB: teamB.id,
                    scoreA: null,
                    scoreB: null,
                    played: false,
                    events: []
                });
            }
        }
        teams.splice(1, 0, teams.pop()); // Rotaciona array
    }
    
    saveData();
    alert('Tabela gerada!');
}

function openMatchModal(matchId) {
    if (!isAdmin()) return alert("Apenas Admin pode editar resultados.");
    currentMatchId = matchId;
    const match = data.matches.find(m => m.id === matchId);
    const tA = data.teams.find(t => t.id === match.teamA);
    const tB = data.teams.find(t => t.id === match.teamB);

    document.getElementById('matchTitle').innerText = `${tA.name} x ${tB.name}`;
    document.getElementById('scoreA').value = match.scoreA;
    document.getElementById('scoreB').value = match.scoreB;
    
    // Popular Selects de Eventos
    const teamSelect = document.getElementById('eventTeam');
    teamSelect.innerHTML = `<option value="">Selecione o Time</option>
                            <option value="${tA.id}">${tA.name}</option>
                            <option value="${tB.id}">${tB.name}</option>`;
    
    renderEventsList(match);
    openModal('matchModal');
}

function loadPlayersForEvent() {
    const teamId = parseInt(document.getElementById('eventTeam').value);
    const playerSelect = document.getElementById('eventPlayer');
    playerSelect.innerHTML = '<option value="">Selecione Jogador</option>';
    
    if(!teamId) return;

    const team = data.teams.find(t => t.id === teamId);
    team.players.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.innerText = p.name;
        playerSelect.appendChild(opt);
    });
}

function addEvent() {
    const match = data.matches.find(m => m.id === currentMatchId);
    const type = document.getElementById('eventType').value;
    const teamId = document.getElementById('eventTeam').value;
    const playerId = document.getElementById('eventPlayer').value;
    const playerText = document.getElementById('eventPlayer').options[document.getElementById('eventPlayer').selectedIndex].text;

    if(!teamId || !playerId) return;

    match.events.push({ type, teamId, playerId, playerName: playerText });
    saveData(); // Salva para persistir o evento
    renderEventsList(match);
}

function renderEventsList(match) {
    const list = document.getElementById('eventsList');
    list.innerHTML = '';
    match.events.forEach((e, index) => {
        const li = document.createElement('li');
        let icon = e.type === 'goal' ? '⚽' : (e.type === 'yellow' ? '🟨' : '🟥');
        li.innerText = `${icon} ${e.playerName}`;
        list.appendChild(li);
    });
}

function saveMatchResult() {
    const match = data.matches.find(m => m.id === currentMatchId);
    const sA = document.getElementById('scoreA').value;
    const sB = document.getElementById('scoreB').value;

    if (sA === '' || sB === '') return alert('Informe o placar');

    match.scoreA = parseInt(sA);
    match.scoreB = parseInt(sB);
    match.played = true;

    // Atualizar stats dos jogadores baseado nos eventos
    // (Simplificado: limpa e recalcula tudo no renderAll para evitar duplicação)
    
    closeModal('matchModal');
    saveData();
    addToFeed(`Resultado: Jogo #${match.id} terminou ${sA} x ${sB}`);
}

// --- IV. CLASSIFICAÇÃO (Cálculo Automático) ---
function calculateStandings() {
    // Inicializa tabela zerada
    let table = data.teams.map(t => ({
        ...t, P:0, J:0, V:0, E:0, D:0, GP:0, GC:0, SG:0
    }));

    data.matches.forEach(m => {
        if (m.played) {
            let tA = table.find(t => t.id === m.teamA);
            let tB = table.find(t => t.id === m.teamB);

            if (tA && tB) {
                tA.J++; tB.J++;
                tA.GP += m.scoreA; tA.GC += m.scoreB; tA.SG = tA.GP - tA.GC;
                tB.GP += m.scoreB; tB.GC += m.scoreA; tB.SG = tB.GP - tB.GC;

                if (m.scoreA > m.scoreB) {
                    tA.V++; tA.P += 3; tB.D++;
                } else if (m.scoreA < m.scoreB) {
                    tB.V++; tB.P += 3; tA.D++;
                } else {
                    tA.E++; tA.P += 1;
                    tB.E++; tB.P += 1;
                }
            }
        }
    });

    // Ordenar: Pontos > Vitórias > Saldo
    return table.sort((a, b) => b.P - a.P || b.V - a.V || b.SG - a.SG);
}

// --- V. ESTATÍSTICAS ---
function calculatePlayerStats() {
    let players = [];
    // Coleta todos os eventos de todos os jogos
    data.matches.forEach(m => {
        m.events.forEach(e => {
            let p = players.find(x => x.id == e.playerId);
            if (!p) {
                p = { id: e.playerId, name: e.playerName, goals: 0, yellow: 0, red: 0 };
                players.push(p);
            }
            if (e.type === 'goal') p.goals++;
            if (e.type === 'yellow') p.yellow++;
            if (e.type === 'red') p.red++;
        });
    });
    return players;
}

// --- RENDERS (ATUALIZAR UI) ---
function renderAll() {
    // Render Times
    const teamsContainer = document.getElementById('teamsList');
    teamsContainer.innerHTML = data.teams.map(t => 
        `<div class="team-card"><h4>${t.name}</h4><small>${t.players.length} Jogadores</small></div>`
    ).join('');

    // Render Jogos
    const matchesContainer = document.getElementById('matchesList');
    matchesContainer.innerHTML = data.matches.map(m => {
        const tA = data.teams.find(t => t.id === m.teamA)?.name || 'X';
        const tB = data.teams.find(t => t.id === m.teamB)?.name || 'X';
        const score = m.played ? `${m.scoreA} - ${m.scoreB}` : 'vs';
        const btnClass = m.played ? 'btn-secondary' : 'btn-primary';
        return `
            <div class="match-card">
                <small>Rodada ${m.round}</small>
                <div class="match-teams">${tA} <span class="match-score">${score}</span> ${tB}</div>
                <button class="${btnClass}" onclick="openMatchModal(${m.id})"><i class="fas fa-edit"></i></button>
            </div>`;
    }).join('');

    // Render Tabela
    const standings = calculateStandings();
    const tbody = document.getElementById('standingsBody');
    tbody.innerHTML = standings.map((t, index) => {
        const perc = t.J > 0 ? Math.round((t.P / (t.J * 3)) * 100) : 0;
        return `
        <tr>
            <td>${index + 1}º</td>
            <td style="text-align:left; font-weight:bold">${t.name}</td>
            <td><strong>${t.P}</strong></td>
            <td>${t.J}</td>
            <td>${t.V}</td>
            <td>${t.E}</td>
            <td>${t.D}</td>
            <td>${t.GP}</td>
            <td>${t.GC}</td>
            <td>${t.SG}</td>
            <td>${perc}%</td>
        </tr>`;
    }).join('');

    // Render Stats
    const stats = calculatePlayerStats();
    
    // Artilharia
    const topScorers = [...stats].sort((a,b) => b.goals - a.goals).slice(0, 5);
    document.getElementById('topScorers').innerHTML = topScorers.map(p => 
        `<li><span>${p.name}</span> <strong>${p.goals}</strong></li>`
    ).join('');

    // Cartões
    const topRed = [...stats].sort((a,b) => b.red - a.red).filter(p => p.red > 0);
    document.getElementById('redCards').innerHTML = topRed.map(p => 
        `<li><span>${p.name}</span> <strong>${p.red}</strong></li>`
    ).join('');

    // Feed
    document.getElementById('newsFeed').innerHTML = data.feed.map(f => 
        `<div style="padding:10px; border-bottom:1px solid #eee; font-size:14px">
            <small style="color:#999">${f.date}</small><br>${f.text}
        </div>`
    ).join('');
}

// --- UTILITÁRIOS ---
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function toggleAdmin() {
    const isAdmin = document.getElementById('adminMode').checked;
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin ? 'inline-block' : 'none';
    });
}
function isAdmin() { return document.getElementById('adminMode').checked; }

function addToFeed(text) {
    const now = new Date().toLocaleString();
    data.feed.unshift({ date: now, text: text });
    if(data.feed.length > 10) data.feed.pop(); // Mantém apenas os 10 últimos
}
