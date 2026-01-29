// --- BANCO DE DADOS E SESSÃO ---
const DB_KEY = 'arenaFut_DB';
const SESSION_KEY = 'arenaFut_Session';

// Estado Global
let currentUser = null;
let currentData = {
    config: { name: '', type: 'futebol', ptsWin:3, ptsDraw:1, ptsLoss:0, cardsSuspension:3, fineRed:0 },
    teams: [],
    matches: []
};

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
});

function initAuth() {
    // 1. Tenta recuperar sessão salva
    const session = localStorage.getItem(SESSION_KEY);
    if(session) {
        const [user, pass] = session.split('|');
        if(loginLogic(user, pass, false)) {
            return; // Se logou, para aqui.
        }
    }

    // 2. Configura o formulário de login
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault(); // IMPORTANTE: Impede recarregar a página
        
        const u = document.getElementById('usernameInput').value.trim();
        const p = document.getElementById('passwordInput').value.trim();
        
        if(!u || p.length < 4) return alert("Preencha corretamente.");

        handleLoginOrRegister(u, p);
    });
}

function handleLoginOrRegister(user, pass) {
    const db = getDB();
    
    if(db[user]) {
        // Tenta logar
        if(!loginLogic(user, pass, true)) {
            alert("Senha incorreta!");
        }
    } else {
        // Tenta registrar
        if(confirm(`Usuário "${user}" não existe. Criar nova conta?`)) {
            createAccount(user, pass);
        }
    }
}

function createAccount(user, pass) {
    const db = getDB();
    db[user] = {
        password: pass,
        data: {
            config: { name: 'Novo Campeonato', type: 'futebol', ptsWin:3, ptsDraw:1, ptsLoss:0, cardsSuspension:3, fineRed:0 },
            teams: [],
            matches: []
        }
    };
    saveDB(db);
    alert("Conta criada! Entrando...");
    loginLogic(user, pass, true);
}

function loginLogic(user, pass, showAlert) {
    const db = getDB();
    if(db[user] && db[user].password === pass) {
        currentUser = user;
        currentData = db[user].data;
        localStorage.setItem(SESSION_KEY, `${user}|${pass}`);
        
        // REDIRECIONAMENTO (Troca de Telas)
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('app-dashboard').classList.remove('hidden');
        
        app.renderAll();
        return true;
    }
    return false;
}

function performLogout() {
    localStorage.removeItem(SESSION_KEY);
    location.reload();
}

// --- UTILITÁRIOS DE BD ---
function getDB() { return JSON.parse(localStorage.getItem(DB_KEY)) || {}; }
function saveDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
function saveData() {
    if(!currentUser) return;
    const db = getDB();
    db[currentUser].data = currentData;
    saveDB(db);
    app.renderAll(); // Atualiza a tela sempre que salvar
}

// --- APLICAÇÃO (DASHBOARD) ---
const app = {
    tempMatchId: null,
    tempTeamId: null,

    showTab: (tabId) => {
        // Esconde todas
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
        
        // Mostra a certa
        document.getElementById(`tab-${tabId}`).classList.add('active');
        const link = document.getElementById(`link-${tabId}`);
        if(link) link.classList.add('active');
        
        app.renderAll();
    },

    renderAll: () => {
        // Atualiza Infos do Usuário
        document.getElementById('displayUsername').innerText = currentUser;
        
        // Configs e Regras
        const c = currentData.config;
        document.getElementById('tourneyName').value = c.name;
        document.getElementById('tourneyType').value = c.type;
        document.getElementById('ptsWin').value = c.ptsWin;
        document.getElementById('ptsDraw').value = c.ptsDraw;
        document.getElementById('ptsLoss').value = c.ptsLoss;
        document.getElementById('cardsSuspension').value = c.cardsSuspension;
        document.getElementById('fineRed').value = c.fineRed;

        // Listas
        app.renderTeams();
        app.renderMatches();
        app.renderStandings();
        app.renderStats();
    },

    // --- FUNÇÕES DE SALVAR ---
    saveConfig: () => {
        currentData.config.name = document.getElementById('tourneyName').value;
        currentData.config.type = document.getElementById('tourneyType').value;
        saveData();
        alert("Configurações Salvas!");
    },
    saveRules: () => {
        const c = currentData.config;
        c.ptsWin = Number(document.getElementById('ptsWin').value);
        c.ptsDraw = Number(document.getElementById('ptsDraw').value);
        c.ptsLoss = Number(document.getElementById('ptsLoss').value);
        c.cardsSuspension = Number(document.getElementById('cardsSuspension').value);
        c.fineRed = Number(document.getElementById('fineRed').value);
        saveData();
        alert("Regras Salvas!");
    },

    // --- TIMES ---
    addTeam: () => {
        const name = document.getElementById('newTeamName').value;
        if(!name) return;
        currentData.teams.push({ id: Date.now(), name: name, players: [] });
        document.getElementById('newTeamName').value = '';
        ui.closeModal('modal-team');
        saveData();
    },
    renderTeams: () => {
        const list = document.getElementById('teams-list');
        list.innerHTML = currentData.teams.map(t => `
            <div class="team-card" onclick="app.openSquad(${t.id})">
                <h4>${t.name}</h4>
                <small>${t.players.length} Jogadores</small>
            </div>
        `).join('');
    },

    // --- ELENCO ---
    openSquad: (id) => {
        app.tempTeamId = id;
        const t = currentData.teams.find(x => x.id === id);
        document.getElementById('squadTeamName').innerText = t.name;
        app.renderSquadList();
        ui.openModal('modal-squad');
    },
    addPlayer: () => {
        const n = document.getElementById('pName').value;
        const num = document.getElementById('pNumber').value;
        const pos = document.getElementById('pPos').value;
        if(!n) return;
        
        const t = currentData.teams.find(x => x.id === app.tempTeamId);
        t.players.push({ id: Date.now(), name: n, number: num, pos: pos });
        
        document.getElementById('pName').value = '';
        document.getElementById('pNumber').value = '';
        saveData();
    },
    renderSquadList: () => {
        const t = currentData.teams.find(x => x.id === app.tempTeamId);
        document.getElementById('squad-list-body').innerHTML = t.players.map((p, i) => `
            <tr>
                <td>${p.number}</td>
                <td>${p.name}</td>
                <td>${p.pos}</td>
                <td><button onclick="app.removePlayer(${i})" style="color:red;border:none;background:transparent;cursor:pointer">X</button></td>
            </tr>
        `).join('');
    },
    removePlayer: (idx) => {
        const t = currentData.teams.find(x => x.id === app.tempTeamId);
        t.players.splice(idx, 1);
        saveData();
    },

    // --- JOGOS ---
    generateFixture: () => {
        const teams = currentData.teams;
        if(teams.length < 2) return alert("Precisa de pelo menos 2 times!");
        currentData.matches = [];
        
        for(let i=0; i<teams.length; i++) {
            for(let j=i+1; j<teams.length; j++) {
                currentData.matches.push({
                    id: Date.now() + Math.random(),
                    teamA: teams[i].id,
                    teamB: teams[j].id,
                    events: [],
                    ended: false
                });
            }
        }
        saveData();
    },
    renderMatches: () => {
        const list = document.getElementById('matches-list');
        list.innerHTML = currentData.matches.map(m => {
            const tA = currentData.teams.find(x => x.id === m.teamA);
            const tB = currentData.teams.find(x => x.id === m.teamB);
            if(!tA || !tB) return ''; // Proteção

            const gA = m.events.filter(e => e.type === 'goal' && e.teamId == m.teamA).length;
            const gB = m.events.filter(e => e.type === 'goal' && e.teamId == m.teamB).length;

            return `
            <div class="match-card">
                <div style="flex:1; text-align:right"><b>${tA.name}</b></div>
                <div class="match-score-badge">${m.ended ? `${gA} x ${gB}` : 'VS'}</div>
                <div style="flex:1; text-align:left"><b>${tB.name}</b></div>
                <button class="btn-secondary" onclick="app.openMatch(${m.id})">Súmula</button>
            </div>`;
        }).join('');
    },

    // --- SÚMULA (MATCH) ---
    openMatch: (mid) => {
        app.tempMatchId = mid;
        const m = currentData.matches.find(x => x.id === mid);
        const tA = currentData.teams.find(x => x.id === m.teamA);
        const tB = currentData.teams.find(x => x.id === m.teamB);

        document.getElementById('mTeamA').innerText = tA.name;
        document.getElementById('mTeamB').innerText = tB.name;

        // Select de Time
        const selT = document.getElementById('evtTeam');
        selT.innerHTML = `<option value="">Escolha...</option>
                          <option value="${tA.id}">${tA.name}</option>
                          <option value="${tB.id}">${tB.name}</option>`;
        
        document.getElementById('evtPlayer').innerHTML = '<option value="">Jogador...</option>';
        app.updateScoreUI();
        ui.openModal('modal-match');
    },
    loadPlayersForEvent: () => {
        const tid = document.getElementById('evtTeam').value;
        if(!tid) return;
        const t = currentData.teams.find(x => x.id == tid);
        document.getElementById('evtPlayer').innerHTML = t.players.map(p => 
            `<option value="${p.id}">${p.number} - ${p.name}</option>`
        ).join('');
    },
    addEvent: () => {
        const tid = document.getElementById('evtTeam').value;
        const pid = document.getElementById('evtPlayer').value;
        const type = document.getElementById('evtType').value;
        const time = document.getElementById('evtTime').value;

        if(!tid || !pid || !time) return alert("Preencha o lance completo!");
        
        const m = currentData.matches.find(x => x.id === app.tempMatchId);
        const t = currentData.teams.find(x => x.id == tid);
        const p = t.players.find(x => x.id == pid);

        m.events.push({ teamId: tid, playerId: pid, pName: p.name, type: type, time: Number(time) });
        m.events.sort((a,b) => a.time - b.time);
        
        saveData();
        app.updateScoreUI();
    },
    updateScoreUI: () => {
        const m = currentData.matches.find(x => x.id === app.tempMatchId);
        const gA = m.events.filter(e => e.type === 'goal' && e.teamId == m.teamA).length;
        const gB = m.events.filter(e => e.type === 'goal' && e.teamId == m.teamB).length;
        
        document.getElementById('scoreA').innerText = gA;
        document.getElementById('scoreB').innerText = gB;

        document.getElementById('match-log').innerHTML = m.events.map(e => {
            const icon = e.type === 'goal' ? '⚽' : (e.type === 'yellow' ? '🟨' : '🟥');
            return `<li>${e.time}' ${icon} ${e.pName}</li>`;
        }).join('');
    },
    finishMatch: () => {
        const m = currentData.matches.find(x => x.id === app.tempMatchId);
        m.ended = true;
        saveData();
        ui.closeModal('modal-match');
    },

    // --- TABELA E STATS ---
    renderStandings: () => {
        let st = {};
        currentData.teams.forEach(t => st[t.id] = { name:t.name, P:0, J:0, V:0, E:0, D:0, GP:0, GC:0, SG:0 });
        const c = currentData.config;

        currentData.matches.forEach(m => {
            if(m.ended) {
                const gA = m.events.filter(e => e.type === 'goal' && e.teamId == m.teamA).length;
                const gB = m.events.filter(e => e.type === 'goal' && e.teamId == m.teamB).length;
                
                const sA = st[m.teamA]; const sB = st[m.teamB];
                if(!sA || !sB) return;

                sA.J++; sB.J++;
                sA.GP += gA; sA.GC += gB; sA.SG = sA.GP - sA.GC;
                sB.GP += gB; sB.GC += gA; sB.SG = sB.GP - sB.GC;

                if(gA > gB) { sA.V++; sA.P += c.ptsWin; sB.D++; sB.P += c.ptsLoss; }
                else if(gB > gA) { sB.V++; sB.P += c.ptsWin; sA.D++; sA.P += c.ptsLoss; }
                else { sA.E++; sB.E++; sA.P += c.ptsDraw; sB.P += c.ptsDraw; }
            }
        });

        const sorted = Object.values(st).sort((a,b) => b.P - a.P || b.V - a.V || b.SG - a.SG);
        document.getElementById('standings-body').innerHTML = sorted.map((t,i) => `
            <tr><td>${i+1}</td><td style="text-align:left">${t.name}</td><td><b>${t.P}</b></td><td>${t.J}</td><td>${t.V}</td><td>${t.E}</td><td>${t.D}</td><td>${t.GP}</td><td>${t.GC}</td><td>${t.SG}</td></tr>
        `).join('');
    },

    renderStats: () => {
        let players = {};
        currentData.matches.forEach(m => {
            m.events.forEach(e => {
                if(!players[e.playerId]) players[e.playerId] = { name: e.pName, goal:0, yellow:0, red:0 };
                if(e.type === 'goal') players[e.playerId].goal++;
                if(e.type === 'yellow') players[e.playerId].yellow++;
                if(e.type === 'red') players[e.playerId].red++;
            });
        });

        const render = (prop, elId) => {
            const arr = Object.values(players).filter(p => p[prop] > 0).sort((a,b) => b[prop] - a[prop]).slice(0,5);
            document.getElementById(elId).innerHTML = arr.map(p => `<li><span>${p.name}</span> <b>${p[prop]}</b></li>`).join('');
        };
        render('goal', 'stats-goals');
        render('red', 'stats-reds');
        render('yellow', 'stats-yellows');
    }
};

// --- UI HELPERS ---
const ui = {
    openModal: (id) => document.getElementById(id).style.display = 'flex',
    closeModal: (id) => document.getElementById(id).style.display = 'none'
};
