// Takım verileri
let teamData = {};
let teamStats = {};

// Tahmin Et butonunu kontrol et
function checkPredictButton() {
    const team1Stats = document.getElementById('team1-stats').innerHTML;
    const team2Stats = document.getElementById('team2-stats').innerHTML;
    const predictBtn = document.querySelector('.predict-btn');
    
    predictBtn.disabled = !(team1Stats && team2Stats);
}

// Her iki takımın verilerini çek
function fetchBothTeams() {
    const team1Name = document.getElementById('team1-name').value.trim();
    const team2Name = document.getElementById('team2-name').value.trim();
    
    if (!team1Name || !team2Name) {
        alert('Lütfen her iki takımın da adını girin!');
        return;
    }
    
    fetchTeamData('team1');
    fetchTeamData('team2');
    
    // Fetch butonunu devre dışı bırak
    const fetchBtn = document.querySelector('.fetch-btn');
    fetchBtn.disabled = true;
    
    // Predict butonunu aktif et
    const predictBtn = document.querySelector('.predict-btn');
    predictBtn.disabled = false;
}

// CSV verilerini yükle
async function loadLeagueData(leagueKey) {
    try {
        console.log(`${leagueKey} verileri yükleniyor...`);
        
        // Ana veriler
        const response = await fetch(`../leagues/${leagueKey}.csv`);
        if (!response.ok) {
            throw new Error(`Ana veri yüklenemedi: ${response.status}`);
        }
        const csvText = await response.text();
        
        // İstatistik verileri
        const statsResponse = await fetch(`../leagues/statistics/${leagueKey}.csv`);
        if (!statsResponse.ok) {
            throw new Error(`İstatistik verisi yüklenemedi: ${statsResponse.status}`);
        }
        const statsText = await statsResponse.text();
        
        const mainData = parseCSV(csvText);
        const statsData = parseCSV(statsText);
        
        console.log(`${leagueKey} verileri başarıyla yüklendi:`, {
            mainCount: mainData.length,
            statsCount: statsData.length
        });
        
        return {
            main: mainData,
            stats: statsData
        };
    } catch (error) {
        console.error(`${leagueKey} verileri yüklenirken hata:`, error);
        return { main: [], stats: [] };
    }
}

// CSV verilerini parse et
function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, i) => {
            obj[header.trim()] = values[i].trim();
        });
        return obj;
    });
}

// Tüm lig verilerini yükle
async function loadAllLeagues() {
    const leagues = {
        'super_lig': 'Süper Lig',
        'premier_league': 'Premier League',
        'la_liga': 'La Liga',
        'bundesliga': 'Bundesliga',
        'serie_a': 'Serie A',
        'ligue_1': 'Ligue 1'
    };
    
    for (const [key, name] of Object.entries(leagues)) {
        const data = await loadLeagueData(key);
        
        // Ana verileri işle
        data.main.forEach(team => {
            teamData[team.team_name.toLowerCase()] = {
                ...team,
                league: name
            };
        });
        
        // İstatistik verilerini işle
        data.stats.forEach(stats => {
            teamStats[stats.team_name.toLowerCase()] = stats;
        });
    }
}

// Sayfa yüklendiğinde verileri yükle
window.addEventListener('load', loadAllLeagues);

// Takım verilerini getir ve göster
async function fetchTeamData(teamId) {
    const input = document.getElementById(`${teamId}-name`);
    const teamName = input.value.trim().toLowerCase();
    
    if (!teamName) {
        showError('Lütfen takım adı girin!');
        return;
    }
    
    const team = findTeam(teamName);
    if (!team) {
        showError('Takım bulunamadı!');
        return;
    }
    
    // Takım adını ve lig bilgisini güncelle
    input.value = `${team.team_name} (${team.league})`;
}

// Takımı bul
function findTeam(searchName) {
    const normalizedSearch = searchName.toLowerCase().trim();
    
    // Tam eşleşme kontrolü
    const exactMatch = Object.values(teamData).find(team => 
        team.team_name.toLowerCase() === normalizedSearch
    );
    if (exactMatch) return exactMatch;
    
    // Kısmi eşleşme kontrolü
    const partialMatch = Object.values(teamData).find(team => 
        team.team_name.toLowerCase().includes(normalizedSearch)
    );
    if (partialMatch) return partialMatch;
    
    // Alternatif isimlerle eşleşme kontrolü
    const alternativeNames = {
        'fb': 'fenerbahce',
        'gs': 'galatasaray',
        'bjk': 'besiktas',
        'ts': 'trabzonspor'
    };
    
    const alternativeName = alternativeNames[normalizedSearch];
    if (alternativeName) {
        return Object.values(teamData).find(team => 
            team.team_name.toLowerCase().includes(alternativeName)
        );
    }
    
    return null;
}

// Lig sıralaması gösterimi
function updatePosition(teamId, team) {
    const container = document.getElementById(`${teamId}-position`);
    container.innerHTML = `${team.position}/${team.total_teams}`;
}

// İstatistikleri göster
function updateStats(teamId, team) {
    const container = document.getElementById(`${teamId}-stats`);
    const stats = teamStats[team.team_name.toLowerCase()];
    
    if (!stats) {
        console.error(`${team.team_name} için istatistik bulunamadı`);
        container.innerHTML = '<div class="error">İstatistikler yüklenemedi</div>';
        return;
    }
    
    // Takım gücünü hesapla
    const teamStrength = calculateTeamStrength(team);
    
    container.innerHTML = `
        <div class="stat-item">
            <div class="stat-label">Takım Gücü</div>
            <div class="stat-value">${teamStrength.toFixed(1)}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Attığı Gol</div>
            <div class="stat-value">${team.goals_for || 0} (${stats.goals_per_match || 0}/Maç)</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Yediği Gol</div>
            <div class="stat-value">${team.goals_against || 0}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Top Sahipliği</div>
            <div class="stat-value">%${stats.possession || 0}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Pas İsabeti</div>
            <div class="stat-value">%${stats.pass_accuracy || 0}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">İsabetli Şut</div>
            <div class="stat-value">${stats.shots_on_target_per_match || 0}/Maç</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Puan</div>
            <div class="stat-value">${team.points || 0}</div>
        </div>
    `;
    
    // Takım pozisyonunu güncelle
    updatePosition(teamId, team);
}

// Takım gücünü hesapla
function calculateTeamStrength(team) {
    if (!team) return 0;
    
    const stats = teamStats[team.team_name.toLowerCase()];
    if (!stats) return 0;
    
    let strength = 0;
    
    // Lig pozisyonu puanı (15%)
    const position = parseInt(team.position);
    const totalTeams = parseInt(team.total_teams);
    const positionScore = (totalTeams - position + 1) / totalTeams * 100;
    strength += positionScore * 0.15;
    
    // Genel performans puanı (15%)
    const totalMatches = parseInt(team.played);
    if (totalMatches > 0) {
        const winRate = (parseInt(team.wins) * 3 + parseInt(team.draws)) / (totalMatches * 3) * 100;
        strength += winRate * 0.15;
    }
    
    // Gol performansı (15%)
    const goalsScored = parseInt(team.goals_for);
    const goalsConceded = parseInt(team.goals_against);
    if (totalMatches > 0) {
        const scoringRate = goalsScored / totalMatches * 2;
        const defenseRate = (1 - goalsConceded / (totalMatches * 2)) * 100;
        strength += (scoringRate * 0.075 + defenseRate * 0.075);
    }
    
    // Ev/Deplasman performansı (30%)
    const homeMatches = parseInt(team.home_wins) + parseInt(team.home_draws) + parseInt(team.home_losses);
    const awayMatches = parseInt(team.away_wins) + parseInt(team.away_draws) + parseInt(team.away_losses);
    
    if (homeMatches > 0) {
        const homeWinRate = (parseInt(team.home_wins) * 3 + parseInt(team.home_draws)) / (homeMatches * 3) * 100;
        const homeGoalDiff = parseInt(team.home_goals_for) - parseInt(team.home_goals_against);
        const homeStrength = (homeWinRate * 0.7 + (homeGoalDiff / homeMatches) * 30) * 0.15;
        strength += homeStrength;
    }
    
    if (awayMatches > 0) {
        const awayWinRate = (parseInt(team.away_wins) * 3 + parseInt(team.away_draws)) / (awayMatches * 3) * 100;
        const awayGoalDiff = parseInt(team.away_goals_for) - parseInt(team.away_goals_against);
        const awayStrength = (awayWinRate * 0.7 + (awayGoalDiff / awayMatches) * 30) * 0.15;
        strength += awayStrength;
    }
    
    // Detaylı istatistik puanı (25%)
    const possessionScore = parseFloat(stats.possession);
    const passAccuracy = parseFloat(stats.pass_accuracy);
    const shotsOnTarget = parseFloat(stats.shots_on_target_per_match);
    const duelsWon = parseFloat(stats.duels_won);
    
    // Hücum etkinliği
    const attackScore = (shotsOnTarget / 8) * 100; // 8 isabetli şut baz alındı
    
    // Oyun kontrolü
    const controlScore = (possessionScore + passAccuracy) / 2;
    
    // Mücadele gücü
    const duelScore = duelsWon;
    
    strength += (attackScore * 0.1 + controlScore * 0.1 + duelScore * 0.05);
    
    return Math.max(1, Math.min(100, strength));
}

// Maç simülasyonu
function simulateMatch(team1Strength, team2Strength, team1, team2) {
    const stats1 = teamStats[team1.team_name.toLowerCase()];
    const stats2 = teamStats[team2.team_name.toLowerCase()];
    
    // Ev sahibi avantajı
    const homeAdvantage = 10;
    let team1MatchStrength = team1Strength * (1 + homeAdvantage/100);
    
    // Top sahipliği ve pas isabeti farkı etkisi
    if (stats1 && stats2) {
        const possessionDiff = (parseFloat(stats1.possession) - parseFloat(stats2.possession)) / 100;
        const passDiff = (parseFloat(stats1.pass_accuracy) - parseFloat(stats2.pass_accuracy)) / 100;
        team1MatchStrength *= (1 + (possessionDiff + passDiff) * 0.1);
    }
    
    const totalStrength = team1MatchStrength + team2Strength;
    
    // Form farkı ve beraberlik olasılığı
    const formDiff = Math.abs(team1Strength - team2Strength);
    const drawProb = Math.max(15, 30 - formDiff/2);
    
    // Kazanma olasılıkları
    const team1WinProb = (team1MatchStrength / totalStrength) * (100 - drawProb);
    const team2WinProb = (team2Strength / totalStrength) * (100 - drawProb);
    
    const random = Math.random() * 100;
    
    if (random < team1WinProb) return "HOME";
    else if (random < team1WinProb + drawProb) return "DRAW";
    else return "AWAY";
}

// Temizle fonksiyonu
function clearData() {
    // Input alanlarını temizle
    document.getElementById('team1-name').value = '';
    document.getElementById('team2-name').value = '';
    
    // Sonuç alanını temizle
    document.querySelector('.result-text').innerHTML = '';
    
    // Fetch butonunu aktif et
    const fetchBtn = document.querySelector('.fetch-btn');
    fetchBtn.disabled = false;
    
    // Predict butonunu devre dışı bırak
    const predictBtn = document.querySelector('.predict-btn');
    predictBtn.disabled = true;
}

// Predict fonksiyonunu güncelle
async function predict() {
    const team1Name = document.getElementById('team1-name').value.split(' (')[0].trim().toLowerCase();
    const team2Name = document.getElementById('team2-name').value.split(' (')[0].trim().toLowerCase();
    const simCount = 1000000; // Sabit simülasyon sayısı
    
    if (!team1Name || !team2Name) {
        showError('Lütfen her iki takımı da seçin!');
        return;
    }
    
    const team1 = findTeam(team1Name);
    const team2 = findTeam(team2Name);
    
    if (!team1 || !team2) {
        showError('Takımlardan biri veya her ikisi bulunamadı!');
        return;
    }

    // Progress bar'ı göster
    showProgressBar();
    
    const team1Strength = calculateTeamStrength(team1);
    const team2Strength = calculateTeamStrength(team2);
    
    const results = { HOME: 0, DRAW: 0, AWAY: 0 };
    const batchSize = 1000; // Her batch'te işlenecek simülasyon sayısı
    const totalBatches = Math.ceil(simCount / batchSize);
    
    for (let batch = 0; batch < totalBatches; batch++) {
        const currentBatchSize = Math.min(batchSize, simCount - batch * batchSize);
        
        for (let i = 0; i < currentBatchSize; i++) {
            const result = simulateMatch(team1Strength, team2Strength, team1, team2);
            results[result]++;
        }
        
        // Progress bar'ı güncelle
        updateProgress((batch + 1) / totalBatches * 100);
        
        // Animasyon için küçük bir gecikme
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Progress bar'ı gizle ve sonuçları göster
    hideProgressBar();
    showResults(team1.team_name, team2.team_name, results, simCount);
}

// Fetch butonunu kontrol et
function checkFetchButton() {
    const team1Name = document.getElementById('team1-name').value.trim();
    const team2Name = document.getElementById('team2-name').value.trim();
    const fetchBtn = document.querySelector('.fetch-btn');
    
    fetchBtn.disabled = !(team1Name && team2Name);
}

// Progress bar göster
function showProgressBar() {
    const predictBtn = document.querySelector('.predict-btn');
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    progressContainer.innerHTML = `
        <div class="loading-animation">
            <div class="loading-spinner">
                <svg class="loading-ring" viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="20" />
                </svg>
                <div class="loading-text">
                    <span class="percentage">0</span><span class="symbol">%</span>
                </div>
            </div>
            <div class="loading-status">Analiz çalışıyor...</div>
        </div>
    `;
    
    predictBtn.insertAdjacentElement('afterend', progressContainer);
    
    // CSS ekle
    if (!document.getElementById('progress-styles')) {
        const styles = document.createElement('style');
        styles.id = 'progress-styles';
        styles.textContent = `
            .progress-container {
                margin: 30px 0;
                text-align: center;
            }
            
            .loading-animation {
                display: inline-flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
            }
            
            .loading-spinner {
                position: relative;
                width: 120px;
                height: 120px;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            .loading-ring {
                width: 100%;
                height: 100%;
                animation: rotate 2s linear infinite;
                transform-origin: center;
            }
            
            .loading-ring circle {
                fill: none;
                stroke: #238636;
                stroke-width: 4;
                stroke-dasharray: 126;
                stroke-linecap: round;
                transform-origin: center;
                transform: rotate(-90deg);
                animation: dash 1.5s ease-in-out infinite;
            }
            
            .loading-text {
                position: absolute;
                display: flex;
                align-items: baseline;
                font-family: monospace;
            }
            
            .loading-text .percentage {
                font-size: 32px;
                font-weight: bold;
                color: #58a6ff;
            }
            
            .loading-text .symbol {
                font-size: 20px;
                color: #8b949e;
                margin-left: 2px;
            }
            
            .loading-status {
                font-size: 14px;
                color: #8b949e;
                opacity: 0.8;
            }
            
            @keyframes rotate {
                100% {
                    transform: rotate(360deg);
                }
            }
            
            @keyframes dash {
                0% {
                    stroke-dashoffset: 126;
                }
                50% {
                    stroke-dashoffset: 32;
                }
                100% {
                    stroke-dashoffset: 126;
                }
            }
            
            /* Pulse efekti */
            .loading-spinner::after {
                content: '';
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(35, 134, 54, 0.1) 0%, transparent 70%);
                animation: pulse 2s ease-out infinite;
            }
            
            @keyframes pulse {
                0% {
                    transform: scale(0.8);
                    opacity: 0;
                }
                50% {
                    transform: scale(1.2);
                    opacity: 0.3;
                }
                100% {
                    transform: scale(0.8);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(styles);
    }
}

// Progress bar'ı güncelle
function updateProgress(percentage) {
    const progressText = document.querySelector('.loading-text .percentage');
    const circle = document.querySelector('.loading-ring circle');
    
    if (progressText && circle) {
        // Yüzde metnini güncelle
        progressText.textContent = Math.round(percentage);
        
        // Çemberin doluluk oranını güncelle
        const circumference = 2 * Math.PI * 20; // r=20 için çevre uzunluğu
        const offset = circumference - (percentage / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }
}

// Progress bar'ı gizle
function hideProgressBar() {
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) {
        // Kademeli olarak kaybolma efekti
        progressContainer.style.transition = 'opacity 0.3s ease';
        progressContainer.style.opacity = '0';
        setTimeout(() => progressContainer.remove(), 300);
    }
}

// Sonuçları göster
async function showResults(team1Name, team2Name, results, simCount) {
    const team1 = findTeam(team1Name.toLowerCase());
    const team2 = findTeam(team2Name.toLowerCase());
    const stats1 = teamStats[team1.team_name.toLowerCase()];
    const stats2 = teamStats[team2.team_name.toLowerCase()];

    const team1Strength = calculateTeamStrength(team1);
    const team2Strength = calculateTeamStrength(team2);

    // Sadece kadro değerlendirmesini al
    const squadEvaluation = await getSquadEvaluation(team1Name, team2Name);

    const resultText = document.querySelector('.result-text');
    resultText.innerHTML = `
        <div class="results-container">
            <div class="results-header">
                <h3>📊 Analiz Sonuçları (${simCount.toLocaleString()} simülasyon)</h3>
                <div class="match-probabilities">
                    <div class="prob-item home">
                        <div class="team">${team1Name}</div>
                        <div class="percentage">${(results.HOME/simCount*100).toFixed(1)}%</div>
                        <div class="matches">${results.HOME.toLocaleString()} maç</div>
                    </div>
                    <div class="prob-item draw">
                        <div class="team">Beraberlik</div>
                        <div class="percentage">${(results.DRAW/simCount*100).toFixed(1)}%</div>
                        <div class="matches">${results.DRAW.toLocaleString()} maç</div>
                    </div>
                    <div class="prob-item away">
                        <div class="team">${team2Name}</div>
                        <div class="percentage">${(results.AWAY/simCount*100).toFixed(1)}%</div>
                        <div class="matches">${results.AWAY.toLocaleString()} maç</div>
                    </div>
                </div>
            </div>

            <div class="analysis-grid">
                <div class="analysis-card team-strength">
                    <h4>💪 Takım Güçleri</h4>
                    <div class="league-positions">
                        <div class="position-item">
                            <span>${team1Name}</span>
                            <span class="league-name">${team1.league}</span>
                            <span class="position">${team1.position}. sıra (${team1.points} puan)</span>
                        </div>
                        <div class="position-item">
                            <span>${team2Name}</span>
                            <span class="league-name">${team2.league}</span>
                            <span class="position">${team2.position}. sıra (${team2.points} puan)</span>
                        </div>
                    </div>
                    <div class="strength-bars">
                        <div class="strength-item">
                            <span>${team1Name}</span>
                            <div class="progress-bar">
                                <div class="progress" style="width: ${team1Strength}%"></div>
                            </div>
                            <span>${team1Strength.toFixed(1)}</span>
                        </div>
                        <div class="strength-item">
                            <span>${team2Name}</span>
                            <div class="progress-bar">
                                <div class="progress" style="width: ${team2Strength}%"></div>
                            </div>
                            <span>${team2Strength.toFixed(1)}</span>
                        </div>
                    </div>
                </div>

                <div class="analysis-card stats-comparison">
                    <h4>📈 Karşılaştırmalı İstatistikler</h4>
                    <div class="stats-grid">
                        <div class="stat-row">
                            <span>${stats1.goals_per_match}</span>
                            <span>Gol Ortalaması</span>
                            <span>${stats2.goals_per_match}</span>
                        </div>
                        <div class="stat-row">
                            <span>${stats1.shots_on_target_per_match}</span>
                            <span>İsabetli Şut</span>
                            <span>${stats2.shots_on_target_per_match}</span>
                        </div>
                        <div class="stat-row">
                            <span>%${stats1.possession}</span>
                            <span>Top Sahipliği</span>
                            <span>%${stats2.possession}</span>
                        </div>
                        <div class="stat-row">
                            <span>%${stats1.pass_accuracy}</span>
                            <span>Pas İsabeti</span>
                            <span>%${stats2.pass_accuracy}</span>
                        </div>
                    </div>
                </div>

                <div class="analysis-card home-advantage">
                    <h4>🏟️ Saha Avantajı</h4>
                    <div class="comparative-table">
                        <div class="table-header">
                            <div class="team-name">${team1Name}</div>
                            <div class="stat-type">İstatistik</div>
                            <div class="team-name">${team2Name}</div>
                        </div>
                        <div class="table-row">
                            <div class="home-value">${parseInt(team1.home_wins) + parseInt(team1.home_draws) + parseInt(team1.home_losses)}</div>
                            <div class="stat-label">Maç Sayısı</div>
                            <div class="away-value">${parseInt(team2.away_wins) + parseInt(team2.away_draws) + parseInt(team2.away_losses)}</div>
                        </div>
                        <div class="table-row">
                            <div class="home-value">${team1.home_wins}</div>
                            <div class="stat-label">Galibiyet</div>
                            <div class="away-value">${team2.away_wins}</div>
                        </div>
                        <div class="table-row">
                            <div class="home-value">${team1.home_draws}</div>
                            <div class="stat-label">Beraberlik</div>
                            <div class="away-value">${team2.away_draws}</div>
                        </div>
                        <div class="table-row">
                            <div class="home-value">${team1.home_losses}</div>
                            <div class="stat-label">Mağlubiyet</div>
                            <div class="away-value">${team2.away_losses}</div>
                        </div>
                        <div class="table-row">
                            <div class="home-value">${team1.home_goals_for}</div>
                            <div class="stat-label">Attığı Gol</div>
                            <div class="away-value">${team2.away_goals_for}</div>
                        </div>
                        <div class="table-row">
                            <div class="home-value">${team1.home_goals_against}</div>
                            <div class="stat-label">Yediği Gol</div>
                            <div class="away-value">${team2.away_goals_against}</div>
                        </div>
                        <div class="table-row highlight">
                            <div class="home-value">${(parseInt(team1.home_goals_for) / (parseInt(team1.home_wins) + parseInt(team1.home_draws) + parseInt(team1.home_losses))).toFixed(1)}</div>
                            <div class="stat-label">Maç Başı Gol</div>
                            <div class="away-value">${(parseInt(team2.away_goals_for) / (parseInt(team2.away_wins) + parseInt(team2.away_draws) + parseInt(team2.away_losses))).toFixed(1)}</div>
                        </div>
                    </div>
                </div>

                <div class="analysis-card match-analysis">
                    <h4>🔍 Maç Analizi</h4>
                    <div class="analysis-points">
                        <div class="analysis-point">${getStrengthComparison(team1Name, team2Name, team1Strength, team2Strength)}</div>
                        <div class="analysis-point">${getPossessionAnalysis(stats1, stats2)}</div>
                        <div class="analysis-point">${getFormAnalysis(team1, team2)}</div>
                        <div class="analysis-point">${getGoalAnalysis(team1, team2)}</div>
                        <div class="analysis-point">${getDefenseAnalysis(team1, team2)}</div>
                        <div class="analysis-point">${getOverallAnalysis(team1, team2, team1Strength, team2Strength)}</div>
                    </div>
                </div>

                <div class="analysis-card attacking-efficiency">
                    <h4>⚽ Hücum Etkinliği</h4>
                    <div class="analysis-points">
                        <div class="analysis-point">${getAttackingEfficiency(team1, team2, stats1, stats2)}</div>
                        <div class="analysis-point">${getPassingAnalysis(stats1, stats2)}</div>
                        <div class="stat-row">
                            <span>${(parseFloat(stats1.goals_per_match) / parseFloat(stats1.shots_on_target_per_match) * 100).toFixed(1)}%</span>
                            <span>Şut Verimliliği</span>
                            <span>${(parseFloat(stats2.goals_per_match) / parseFloat(stats2.shots_on_target_per_match) * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
                
                <div class="analysis-card physical-stats">
                    <h4>💪 Fiziksel Performans</h4>
                    <div class="analysis-points">
                        <div class="analysis-point">${getDuelAnalysis(stats1, stats2)}</div>
                        <div class="stat-row">
                            <span>${stats1.duels_won}%</span>
                            <span>İkili Mücadele</span>
                            <span>${stats2.duels_won}%</span>
                        </div>
                        <div class="stat-row">
                            <span>${stats1.aerial_duels_won}%</span>
                            <span>Hava Topu</span>
                            <span>${stats2.aerial_duels_won}%</span>
                        </div>
                    </div>
                </div>
                
                <div class="analysis-card set-pieces">
                    <h4>🎯 Duran Top</h4>
                    <div class="analysis-points">
                        <div class="analysis-point">${getSetPieceAnalysis(stats1, stats2)}</div>
                        <div class="stat-row">
                            <span>${stats1.corners_per_match}</span>
                            <span>Korner/Maç</span>
                            <span>${stats2.corners_per_match}</span>
                        </div>
                    </div>
                </div>
                
                <div class="analysis-card match-trend">
                    <h4>📈 Maç Trendi</h4>
                    <div class="analysis-points">
                        <div class="analysis-point">${getMatchTrendAnalysis(team1, team2)}</div>
                        <div class="analysis-point">Son maçlarda ev sahibi: ${team1.home_goals_for} gol attı, ${team1.home_goals_against} gol yedi</div>
                        <div class="analysis-point">Son maçlarda deplasman: ${team2.away_goals_for} gol attı, ${team2.away_goals_against} gol yedi</div>
                    </div>
                </div>

                <div class="analysis-card squad-evaluation">
                    <h4>📋 Kadro Değerlendirmesi</h4>
                    <div class="analysis-points">
                        ${squadEvaluation}
                    </div>
                </div>

                <div class="analysis-card premium-card">
                    <div class="premium-overlay">
                        <span class="premium-icon">⭐</span>
                        <span class="premium-text">Detaylı Analiz İçin Premium Satın Al</span>
                    </div>
                    <h4>💰 Detaylı Skor Tahmini</h4>
                    <div class="analysis-points blur-content">
                        <div class="analysis-point">Muhtemel skor aralıkları ve olasılıkları</div>
                        <div class="analysis-point">Gol dakika tahminleri</div>
                        <div class="analysis-point">İlk yarı / İkinci yarı analizi</div>
                    </div>
                </div>

                <div class="analysis-card premium-card">
                    <div class="premium-overlay">
                        <span class="premium-icon">⭐</span>
                        <span class="premium-text">Detaylı Analiz İçin Premium Satın Al</span>
                    </div>
                    <h4>💰 Bahis Analizi</h4>
                    <div class="analysis-points blur-content">
                        <div class="analysis-point">Değerli bahis önerileri</div>
                        <div class="analysis-point">Risk/Kazanç oranları</div>
                        <div class="analysis-point">Özel bahis tavsiyeleri</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    addCustomStyles();
}

// Güç karşılaştırması analizi
function getStrengthComparison(team1Name, team2Name, team1Strength, team2Strength) {
    const diff = Math.abs(team1Strength - team2Strength);
    if (diff < 5) {
        return "Takımlar birbirine çok yakın güçte";
    } else if (diff < 15) {
        const stronger = team1Strength > team2Strength ? team1Name : team2Name;
        return `${stronger} hafif favori görünüyor`;
    } else {
        const stronger = team1Strength > team2Strength ? team1Name : team2Name;
        return `${stronger} belirgin şekilde favori`;
    }
}

// Top sahipliği analizi
function getPossessionAnalysis(stats1, stats2) {
    const diff = Math.abs(parseFloat(stats1.possession) - parseFloat(stats2.possession));
    if (diff < 5) {
        return "Top sahipliği dengeli olabilir";
    } else {
        const better = parseFloat(stats1.possession) > parseFloat(stats2.possession) ? "Ev sahibi" : "Deplasman";
        return `${better} top kontrolünde daha etkili olabilir`;
    }
}

// Form analizi
function getFormAnalysis(team1, team2) {
    const team1Points = parseInt(team1.points);
    const team2Points = parseInt(team2.points);
    const team1Matches = parseInt(team1.played);
    const team2Matches = parseInt(team2.played);
    
    const team1Form = team1Points / (team1Matches * 3) * 100;
    const team2Form = team2Points / (team2Matches * 3) * 100;
    
    const diff = Math.abs(team1Form - team2Form);
    if (diff < 10) {
        return "Her iki takım da benzer form grafiğinde";
    } else {
        const better = team1Form > team2Form ? "Ev sahibi" : "Deplasman";
        return `${better} daha iyi formda görünüyor`;
    }
}

// Gol analizi
function getGoalAnalysis(team1, team2) {
    const team1GoalRatio = parseInt(team1.goals_for) / parseInt(team1.played);
    const team2GoalRatio = parseInt(team2.goals_for) / parseInt(team2.played);
    
    const diff = Math.abs(team1GoalRatio - team2GoalRatio);
    if (diff < 0.3) {
        return "Her iki takım da benzer gol ortalamasına sahip";
    } else {
        const better = team1GoalRatio > team2GoalRatio ? "Ev sahibi" : "Deplasman";
        return `${better} gol bulma konusunda daha etkili`;
    }
}

// Savunma analizi
function getDefenseAnalysis(team1, team2) {
    const team1Defense = parseInt(team1.goals_against) / parseInt(team1.played);
    const team2Defense = parseInt(team2.goals_against) / parseInt(team2.played);
    
    const diff = Math.abs(team1Defense - team2Defense);
    if (diff < 0.3) {
        return "Savunma performansları dengeli";
    } else {
        const better = team1Defense < team2Defense ? "Ev sahibi" : "Deplasman";
        return `${better} savunmada daha başarılı`;
    }
}

// Genel analiz
function getOverallAnalysis(team1, team2, team1Strength, team2Strength) {
    const strengthDiff = Math.abs(team1Strength - team2Strength);
    const team1Form = parseInt(team1.points) / (parseInt(team1.played) * 3);
    const team2Form = parseInt(team2.points) / (parseInt(team2.played) * 3);
    const formDiff = Math.abs(team1Form - team2Form);
    
    if (strengthDiff < 5 && formDiff < 0.1) {
        return "Çekişmeli ve dengeli bir maç bekleniyor";
    } else if (strengthDiff > 15 || formDiff > 0.3) {
        const better = team1Strength > team2Strength ? "Ev sahibi" : "Deplasman";
        return `${better} maçın favorisi olarak öne çıkıyor`;
    } else {
        return "Hafif üstünlük avantajıyla rekabetçi bir maç bekleniyor";
    }
}

// Yeni analiz fonksiyonları ekle
function getAttackingEfficiency(team1, team2, stats1, stats2) {
    const team1ShotEfficiency = parseFloat(stats1.goals_per_match) / parseFloat(stats1.shots_on_target_per_match);
    const team2ShotEfficiency = parseFloat(stats2.goals_per_match) / parseFloat(stats2.shots_on_target_per_match);
    
    const diff = Math.abs(team1ShotEfficiency - team2ShotEfficiency);
    
    let analysis = "";
    if (diff < 0.1) {
        analysis = "İki takım da şut fırsatlarını benzer oranda gole çeviriyor";
    } else {
        const better = team1ShotEfficiency > team2ShotEfficiency ? "Ev sahibi" : "Deplasman";
        const efficiency = (Math.max(team1ShotEfficiency, team2ShotEfficiency) * 100).toFixed(1);
        analysis = `${better} şut fırsatlarını daha iyi değerlendiriyor (${efficiency}% verimlilik)`;
    }

    // Şut ve gol istatistikleri analizi
    const team1ShotsPerGoal = parseFloat(stats1.shots_per_match) / parseFloat(stats1.goals_per_match);
    const team2ShotsPerGoal = parseFloat(stats2.shots_per_match) / parseFloat(stats2.goals_per_match);
    
    if (Math.abs(team1ShotsPerGoal - team2ShotsPerGoal) > 2) {
        const moreEfficient = team1ShotsPerGoal < team2ShotsPerGoal ? "Ev sahibi" : "Deplasman";
        analysis += `. ${moreEfficient} daha az şutla gol buluyor`;
    }

    return analysis;
}

function getPassingAnalysis(stats1, stats2) {
    const team1Passes = parseFloat(stats1.successful_passes_per_match);
    const team2Passes = parseFloat(stats2.successful_passes_per_match);
    const team1Accuracy = parseFloat(stats1.pass_accuracy);
    const team2Accuracy = parseFloat(stats2.pass_accuracy);
    
    let analysis = [];
    
    // Pas sayısı analizi
    if (Math.abs(team1Passes - team2Passes) > 50) {
        const morePasses = team1Passes > team2Passes ? "Ev sahibi" : "Deplasman";
        analysis.push(`${morePasses} daha fazla pas yapıyor (${Math.max(team1Passes, team2Passes).toFixed(0)}/maç)`);
    }
    
    // Pas isabet oranı analizi
    if (Math.abs(team1Accuracy - team2Accuracy) > 3) {
        const moreAccurate = team1Accuracy > team2Accuracy ? "Ev sahibi" : "Deplasman";
        analysis.push(`${moreAccurate} pas isabetinde daha başarılı (%${Math.max(team1Accuracy, team2Accuracy).toFixed(1)})`);
    }
    
    // Top kontrolü analizi
    const possessionDiff = Math.abs(parseFloat(stats1.possession) - parseFloat(stats2.possession));
    if (possessionDiff > 5) {
        const better = parseFloat(stats1.possession) > parseFloat(stats2.possession) ? "Ev sahibi" : "Deplasman";
        analysis.push(`${better} top kontrolünde üstün (%${Math.max(parseFloat(stats1.possession), parseFloat(stats2.possession))})`);
    }
    
    return analysis.join(". ") || "İki takım da benzer pas oyunu sergiliyor";
}

function getDuelAnalysis(stats1, stats2) {
    const team1Duels = parseFloat(stats1.duels_won);
    const team2Duels = parseFloat(stats2.duels_won);
    const team1Aerial = parseFloat(stats1.aerial_duels_won);
    const team2Aerial = parseFloat(stats2.aerial_duels_won);
    
    let analysis = [];
    
    // Genel ikili mücadele analizi
    if (Math.abs(team1Duels - team2Duels) > 2) {
        const better = team1Duels > team2Duels ? "Ev sahibi" : "Deplasman";
        analysis.push(`${better} ikili mücadelelerde daha başarılı (%${Math.max(team1Duels, team2Duels).toFixed(1)})`);
    } else {
        analysis.push("İkili mücadelelerde dengeli bir görüntü var");
    }
    
    // Hava topu mücadelesi analizi
    if (Math.abs(team1Aerial - team2Aerial) > 3) {
        const better = team1Aerial > team2Aerial ? "Ev sahibi" : "Deplasman";
        analysis.push(`${better} hava toplarında üstünlük sağlıyor (%${Math.max(team1Aerial, team2Aerial).toFixed(1)})`);
    }
    
    return analysis.join(". ");
}

function getSetPieceAnalysis(stats1, stats2) {
    const team1Corners = parseFloat(stats1.corners_per_match);
    const team2Corners = parseFloat(stats2.corners_per_match);
    const cornerDiff = Math.abs(team1Corners - team2Corners);
    
    let analysis = [];
    
    // Korner analizi
    if (cornerDiff > 1) {
        const better = team1Corners > team2Corners ? "Ev sahibi" : "Deplasman";
        analysis.push(`${better} daha fazla korner kullanıyor (${Math.max(team1Corners, team2Corners).toFixed(1)}/maç)`);
    }
    
    // Hava topu ve korner ilişkisi
    const team1Aerial = parseFloat(stats1.aerial_duels_won);
    const team2Aerial = parseFloat(stats2.aerial_duels_won);
    
    if (Math.abs(team1Aerial - team2Aerial) > 3) {
        const better = team1Aerial > team2Aerial ? "Ev sahibi" : "Deplasman";
        analysis.push(`${better} duran toplarda daha etkili olabilir (Hava topu başarısı: %${Math.max(team1Aerial, team2Aerial).toFixed(1)})`);
    }
    
    return analysis.join(". ") || "Duran top etkinliğinde belirgin bir fark görünmüyor";
}

function getMatchTrendAnalysis(team1, team2) {
    // Ev sahibi takımın iç saha performansı
    const team1HomeMatches = parseInt(team1.home_wins) + parseInt(team1.home_draws) + parseInt(team1.home_losses);
    const team1HomeWinRate = (parseInt(team1.home_wins) / team1HomeMatches * 100).toFixed(1);
    const team1HomeGoalsPerMatch = (parseInt(team1.home_goals_for) / team1HomeMatches).toFixed(1);
    const team1HomeConcededPerMatch = (parseInt(team1.home_goals_against) / team1HomeMatches).toFixed(1);
    const team1HomePoints = (parseInt(team1.home_wins) * 3 + parseInt(team1.home_draws)).toFixed(1);
    const team1HomePointsPerMatch = (team1HomePoints / team1HomeMatches).toFixed(1);

    // Deplasman takımının deplasman performansı
    const team2AwayMatches = parseInt(team2.away_wins) + parseInt(team2.away_draws) + parseInt(team2.away_losses);
    const team2AwayWinRate = (parseInt(team2.away_wins) / team2AwayMatches * 100).toFixed(1);
    const team2AwayGoalsPerMatch = (parseInt(team2.away_goals_for) / team2AwayMatches).toFixed(1);
    const team2AwayConcededPerMatch = (parseInt(team2.away_goals_against) / team2AwayMatches).toFixed(1);
    const team2AwayPoints = (parseInt(team2.away_wins) * 3 + parseInt(team2.away_draws)).toFixed(1);
    const team2AwayPointsPerMatch = (team2AwayPoints / team2AwayMatches).toFixed(1);

    // Genel form analizi
    const team1TotalMatches = parseInt(team1.played);
    const team2TotalMatches = parseInt(team2.played);
    const team1RecentForm = ((parseInt(team1.wins) * 3 + parseInt(team1.draws)) / (team1TotalMatches * 3) * 100).toFixed(1);
    const team2RecentForm = ((parseInt(team2.wins) * 3 + parseInt(team2.draws)) / (team2TotalMatches * 3) * 100).toFixed(1);

    // Ev sahibi form analizi
    let homeFormAnalysis = "";
    if (parseFloat(team1HomeWinRate) > 60) {
        homeFormAnalysis = `Ev sahibi iç sahada çok etkili (%${team1HomeWinRate} kazanma, ${team1HomePointsPerMatch} puan/maç)`;
    } else if (parseFloat(team1HomeWinRate) > 40) {
        homeFormAnalysis = `Ev sahibi iç sahada dengeli (%${team1HomeWinRate} kazanma, ${team1HomePointsPerMatch} puan/maç)`;
    } else {
        homeFormAnalysis = `Ev sahibi iç sahada zorlanıyor (%${team1HomeWinRate} kazanma, ${team1HomePointsPerMatch} puan/maç)`;
    }

    // Deplasman form analizi
    let awayFormAnalysis = "";
    if (parseFloat(team2AwayWinRate) > 50) {
        awayFormAnalysis = `Deplasman dışarıda başarılı (%${team2AwayWinRate} kazanma, ${team2AwayPointsPerMatch} puan/maç)`;
    } else if (parseFloat(team2AwayWinRate) > 30) {
        awayFormAnalysis = `Deplasman dışarıda orta düzeyde (%${team2AwayWinRate} kazanma, ${team2AwayPointsPerMatch} puan/maç)`;
    } else {
        awayFormAnalysis = `Deplasman dışarıda etkisiz (%${team2AwayWinRate} kazanma, ${team2AwayPointsPerMatch} puan/maç)`;
    }

    // Savunma analizi
    let defenseAnalysis = "";
    if (parseFloat(team1HomeConcededPerMatch) < 1 && parseFloat(team2AwayConcededPerMatch) < 1) {
        defenseAnalysis = `Her iki takım da savunmada çok sağlam (Ev: ${team1HomeConcededPerMatch}, Dep: ${team2AwayConcededPerMatch} gol/maç)`;
    } else if (parseFloat(team1HomeConcededPerMatch) > 2 && parseFloat(team2AwayConcededPerMatch) > 2) {
        defenseAnalysis = `Her iki takımın da savunması zayıf (Ev: ${team1HomeConcededPerMatch}, Dep: ${team2AwayConcededPerMatch} gol/maç)`;
    } else {
        const betterDefense = parseFloat(team1HomeConcededPerMatch) < parseFloat(team2AwayConcededPerMatch)
            ? `Ev sahibi savunmada daha istikrarlı (${team1HomeConcededPerMatch} gol/maç)`
            : `Deplasman savunmada daha istikrarlı (${team2AwayConcededPerMatch} gol/maç)`;
        defenseAnalysis = betterDefense;
    }

    // Hücum etkinliği analizi
    let attackAnalysis = "";
    const team1ScoringRate = parseFloat(team1HomeGoalsPerMatch);
    const team2ScoringRate = parseFloat(team2AwayGoalsPerMatch);
    
    if (team1ScoringRate > 2 && team2ScoringRate > 1.5) {
        attackAnalysis = `İki takım da hücumda etkili (Ev: ${team1ScoringRate}, Dep: ${team2ScoringRate} gol/maç)`;
    } else if (team1ScoringRate > 2) {
        attackAnalysis = `Ev sahibi hücumda çok etkili (${team1ScoringRate} gol/maç)`;
    } else if (team2ScoringRate > 1.5) {
        attackAnalysis = `Deplasman hücumda etkili (${team2ScoringRate} gol/maç)`;
    }

    // Genel trend analizi
    const trends = [];
    trends.push(homeFormAnalysis);
    trends.push(awayFormAnalysis);
    trends.push(defenseAnalysis);
    trends.push(attackAnalysis);

    // Form karşılaştırması
    const formComparison = Math.abs(parseFloat(team1RecentForm) - parseFloat(team2RecentForm));
    if (formComparison > 20) {
        const betterForm = parseFloat(team1RecentForm) > parseFloat(team2RecentForm)
            ? "Ev sahibi çok daha iyi formda"
            : "Deplasman çok daha iyi formda";
        trends.push(betterForm);
    } else if (formComparison > 10) {
        const betterForm = parseFloat(team1RecentForm) > parseFloat(team2RecentForm)
            ? "Ev sahibi daha iyi formda"
            : "Deplasman daha iyi formda";
        trends.push(betterForm);
    }

    // En önemli 5 trendi seç ve birleştir
    return trends.slice(0, 5).join(". ") + ".";
}

// Yeni analiz fonksiyonları
function calculateEfficiencyScore(stats) {
    const goalEfficiency = parseFloat(stats.goals_per_match) / parseFloat(stats.shots_on_target_per_match) * 100;
    const possessionEfficiency = parseFloat(stats.successful_passes_per_match) / (parseFloat(stats.possession) * 5);
    const duelEfficiency = (parseFloat(stats.duels_won) + parseFloat(stats.aerial_duels_won)) / 2;
    
    return (goalEfficiency * 0.4 + possessionEfficiency * 0.3 + duelEfficiency * 0.3);
}

function calculatePlayStyle(stats) {
    const possession = parseFloat(stats.possession);
    const passAccuracy = parseFloat(stats.pass_accuracy);
    const shotsPerMatch = parseFloat(stats.shots_per_match);
    
    if (possession > 55 && passAccuracy > 85) {
        return "Kontrollü";
    } else if (shotsPerMatch > 12) {
        return "Hücum";
    } else if (parseFloat(stats.duels_won) > 52) {
        return "Fiziksel";
    } else {
        return "Dengeli";
    }
}

function getPerformanceMetrics(team1, team2, stats1, stats2) {
    const team1Efficiency = calculateEfficiencyScore(stats1);
    const team2Efficiency = calculateEfficiencyScore(stats2);
    const team1Style = calculatePlayStyle(stats1);
    const team2Style = calculatePlayStyle(stats2);
    
    let analysis = [];
    
    // Verimlilik analizi
    if (Math.abs(team1Efficiency - team2Efficiency) > 10) {
        const moreEfficient = team1Efficiency > team2Efficiency ? "Ev sahibi" : "Deplasman";
        analysis.push(`${moreEfficient} daha verimli bir performans sergiliyor`);
    } else {
        analysis.push("İki takım da benzer verimlilik seviyesinde");
    }
    
    // Oyun stili karşılaştırması
    if (team1Style === team2Style) {
        analysis.push(`Her iki takım da ${team1Style.toLowerCase()} bir oyun stiline sahip`);
    } else {
        analysis.push(`Ev sahibi ${team1Style.toLowerCase()}, deplasman ${team2Style.toLowerCase()} bir oyun tercih ediyor`);
    }
    
    return analysis.join(". ");
}

// Özel CSS stilleri ekle
function addCustomStyles() {
    // Stil kodları style.css dosyasına taşındı
}

// Saha avantajı kartının HTML yapısını güncelle
function updateHomeAdvantageCard(team1, team2) {
    return `
        <div class="analysis-card home-advantage">
            <h4>🏟️ Saha Avantajı</h4>
            <div class="comparative-table">
                <div class="table-header">
                    <div class="team-name">${team1.team_name}</div>
                    <div class="stat-type">İstatistik</div>
                    <div class="team-name">${team2.team_name}</div>
                </div>
                <div class="table-row">
                    <div class="home-value">${team1.home_wins}</div>
                    <div class="stat-label">G</div>
                    <div class="away-value">${team2.away_wins}</div>
                </div>
                <div class="table-row">
                    <div class="home-value">${team1.home_draws}</div>
                    <div class="stat-label">B</div>
                    <div class="away-value">${team2.away_draws}</div>
                </div>
                <div class="table-row">
                    <div class="home-value">${team1.home_losses}</div>
                    <div class="stat-label">M</div>
                    <div class="away-value">${team2.away_losses}</div>
                </div>
                <div class="table-row">
                    <div class="home-value">${team1.home_goals_for}</div>
                    <div class="stat-label">AG</div>
                    <div class="away-value">${team2.away_goals_for}</div>
                </div>
                <div class="table-row">
                    <div class="home-value">${team1.home_goals_against}</div>
                    <div class="stat-label">YG</div>
                    <div class="away-value">${team2.away_goals_against}</div>
                </div>
                <div class="table-row highlight">
                    <div class="home-value">${(parseInt(team1.home_goals_for) / (parseInt(team1.home_wins) + parseInt(team1.home_draws) + parseInt(team1.home_losses))).toFixed(1)}</div>
                    <div class="stat-label">Gol/Maç</div>
                    <div class="away-value">${(parseInt(team2.away_goals_for) / (parseInt(team2.away_wins) + parseInt(team2.away_draws) + parseInt(team2.away_losses))).toFixed(1)}</div>
                </div>
            </div>
        </div>
    `;
}

// Hata göster
function showError(message) {
    alert(message);
}

// Modal işlemleri
const modal = document.getElementById('premiumModal');
const closeModal = document.querySelector('.close-modal');
const premiumBtn = document.querySelector('.premium-btn');

// Premium kartlara tıklama olayı ekle
document.addEventListener('click', function(e) {
    if (e.target.closest('.premium-overlay')) {
        showPremiumModal();
    }
});

// Modal'ı göster
function showPremiumModal() {
    modal.style.display = 'block';
}

// Modal'ı kapat
function closePremiumModal() {
    modal.style.display = 'none';
}

// Modal dışına tıklandığında kapat
window.onclick = function(event) {
    if (event.target == modal) {
        closePremiumModal();
    }
}

// Kapatma butonuna tıklandığında kapat
closeModal.onclick = closePremiumModal;

// Premium butona tıklandığında
premiumBtn.onclick = function() {
    alert('Premium özellik yakında aktif olacak!');
    closePremiumModal();
}

// Kadro analizi fonksiyonu
async function getSquadAnalysis(team1Name, team2Name) {
    try {
        // Takım verilerini yükle
        const team1Players = await loadTeamPlayers(team1Name);
        const team2Players = await loadTeamPlayers(team2Name);
        
        if (!team1Players.length || !team2Players.length) {
            return `<div class="analysis-point">Takım kadro bilgileri bulunamadı</div>`;
        }

        // Takım istatistiklerini hesapla
        const team1Stats = calculateDetailedTeamStats(team1Players);
        const team2Stats = calculateDetailedTeamStats(team2Players);

        return `
            <div class="squad-stats">
                <div class="analysis-points">
                    <div class="stat-comparison">
                        <div class="team-column">
                            <span class="team-value">${team1Stats.goalPerMatch.toFixed(2)}</span>
                        </div>
                        <div class="stat-label">Maç Başı Gol</div>
                        <div class="team-column">
                            <span class="team-value">${team2Stats.goalPerMatch.toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="stat-comparison">
                        <div class="team-column">
                            <span class="team-value">${team1Stats.assistPerMatch.toFixed(2)}</span>
                        </div>
                        <div class="stat-label">Maç Başı Asist</div>
                        <div class="team-column">
                            <span class="team-value">${team2Stats.assistPerMatch.toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="key-players-section">
                        <h5>⭐ Kilit Oyuncular</h5>
                        <div class="key-players-grid">
                            <div class="team-stats">
                                <div class="stat-comparison">
                                    <div class="player-info">
                                        <span class="player-name">${team1Stats.topScorer.name}</span>
                                        <span class="player-value">${team1Stats.topScorer.goals} gol</span>
                                    </div>
                                    <div class="stat-label">En Golcü</div>
                                    <div class="player-info">
                                        <span class="player-name">${team2Stats.topScorer.name}</span>
                                        <span class="player-value">${team2Stats.topScorer.goals} gol</span>
                                    </div>
                                </div>
                                <div class="stat-comparison">
                                    <div class="player-info">
                                        <span class="player-name">${team1Stats.topAssist.name}</span>
                                        <span class="player-value">${team1Stats.topAssist.assists} asist</span>
                                    </div>
                                    <div class="stat-label">En Asistçi</div>
                                    <div class="player-info">
                                        <span class="player-name">${team2Stats.topAssist.name}</span>
                                        <span class="player-value">${team2Stats.topAssist.assists} asist</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Kadro analizi yapılırken hata:', error);
        return `<div class="analysis-point">Kadro analizi yapılırken bir hata oluştu</div>`;
    }
}

// Takım oyuncularını yükle
async function loadTeamPlayers(teamName) {
    try {
        const response = await fetch(`../leagues/statistics/Players/${teamName.toLowerCase()}_players.csv`);
        if (!response.ok) {
            throw new Error(`Oyuncu verileri yüklenemedi: ${response.status}`);
        }
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error(`${teamName} oyuncu verileri yüklenirken hata:`, error);
        return [];
    }
}

// Kadro değerlendirmesi için yeni fonksiyon
async function getSquadEvaluation(team1Name, team2Name) {
    try {
        const team1Players = await loadTeamPlayers(team1Name);
        const team2Players = await loadTeamPlayers(team2Name);
        
        if (!team1Players.length || !team2Players.length) {
            return `<div class="analysis-point">Takım kadro bilgileri bulunamadı</div>`;
        }

        const team1Stats = calculateDetailedTeamStats(team1Players);
        const team2Stats = calculateDetailedTeamStats(team2Players);

        const analyses = [];

        // En golcü oyuncu analizi
        if (team1Stats.topScorer.goals > 0) {
            analyses.push(`${team1Name} takımının en skorer oyuncusu ${team1Stats.topScorer.name} (${team1Stats.topScorer.goals} gol)`);
        }
        if (team2Stats.topScorer.goals > 0) {
            analyses.push(`${team2Name} takımının en skorer oyuncusu ${team2Stats.topScorer.name} (${team2Stats.topScorer.goals} gol)`);
        }

        // En asistçi oyuncu analizi
        if (team1Stats.topAssist.assists > 0) {
            analyses.push(`${team1Name} takımının asist lideri ${team1Stats.topAssist.name} (${team1Stats.topAssist.assists} asist)`);
        }
        if (team2Stats.topAssist.assists > 0) {
            analyses.push(`${team2Name} takımının asist lideri ${team2Stats.topAssist.name} (${team2Stats.topAssist.assists} asist)`);
        }

        // Şut isabeti analizi
        const team1ShotAccuracy = calculateShotAccuracy(team1Players);
        const team2ShotAccuracy = calculateShotAccuracy(team2Players);
        if (Math.abs(team1ShotAccuracy - team2ShotAccuracy) > 5) {
            const betterTeam = team1ShotAccuracy > team2ShotAccuracy ? team1Name : team2Name;
            analyses.push(`${betterTeam} isabetli şut oranında daha başarılı`);
        }

        // Pas organizasyonu analizi
        const team1PassAccuracy = calculatePassAccuracy(team1Players);
        const team2PassAccuracy = calculatePassAccuracy(team2Players);
        if (Math.abs(team1PassAccuracy - team2PassAccuracy) > 3) {
            const betterTeam = team1PassAccuracy > team2PassAccuracy ? team1Name : team2Name;
            analyses.push(`${betterTeam} pas organizasyonunda daha etkili`);
        }

        // Takım derinliği analizi
        const team1Depth = calculateSquadDepth(team1Players);
        const team2Depth = calculateSquadDepth(team2Players);
        if (Math.abs(team1Depth - team2Depth) > 2) {
            const betterTeam = team1Depth > team2Depth ? team1Name : team2Name;
            analyses.push(`${betterTeam} daha geniş bir kadro derinliğine sahip`);
        }

        return `
            <div class="squad-evaluation">
                <div class="evaluation-header">
                    <div class="team-comparison">
                        <div class="team-info">
                            <span class="team-name">${team1Name}</span>
                            <span class="vs">VS</span>
                            <span class="team-name">${team2Name}</span>
                        </div>
                    </div>
                </div>
                <div class="evaluation-content">
                    ${analyses.map(analysis => `
                        <div class="evaluation-point">
                            <span class="point-icon">▪️</span>
                            <span class="point-text">${analysis}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Kadro değerlendirmesi yapılırken hata:', error);
        return `<div class="analysis-point">Kadro değerlendirmesi yapılırken bir hata oluştu</div>`;
    }
}

// Yardımcı fonksiyonlar
function calculateShotAccuracy(players) {
    const totalShots = players.reduce((sum, player) => {
        return sum + (parseFloat(player.shots_per_match) * parseInt(player.matches) || 0);
    }, 0);
    
    const totalShotsOnTarget = players.reduce((sum, player) => {
        return sum + (parseFloat(player.shots_on_target_per_match) * parseInt(player.matches) || 0);
    }, 0);
    
    return totalShots > 0 ? (totalShotsOnTarget / totalShots) * 100 : 0;
}

function calculatePassAccuracy(players) {
    const weightedAccuracy = players.reduce((sum, player) => {
        const matches = parseInt(player.matches) || 0;
        const accuracy = parseFloat(player.pass_accuracy) || 0;
        return sum + (accuracy * matches);
    }, 0);
    
    const totalMatches = players.reduce((sum, player) => sum + (parseInt(player.matches) || 0), 0);
    
    return totalMatches > 0 ? weightedAccuracy / totalMatches : 0;
}

function calculateSquadDepth(players) {
    const regularPlayers = players.filter(player => parseInt(player.matches) >= 5).length;
    const totalPlayers = players.length;
    return regularPlayers / totalPlayers * 10;
}

// Detaylı takım istatistiklerini hesaplama
function calculateDetailedTeamStats(players) {
    const stats = {
        goalPerMatch: 0,
        assistPerMatch: 0,
        topScorer: null,
        topAssist: null,
        shotAccuracy: 0,
        passAccuracy: 0,
        totalMatches: 0,
        totalGoals: 0,
        totalAssists: 0,
        totalShots: 0,
        totalShotsOnTarget: 0,
        totalPasses: 0,
        totalSuccessfulPasses: 0,
        performanceIndex: 0
    };

    // Toplam maç sayısını hesapla
    stats.totalMatches = players.reduce((sum, player) => sum + (parseInt(player.matches) || 0), 0);

    // En golcü oyuncu (toplam gol sayısına göre)
    stats.topScorer = players.reduce((prev, curr) => {
        const currGoals = parseInt(curr.goals) || 0;
        const prevGoals = parseInt(prev.goals) || 0;

        if (currGoals > prevGoals) {
            return {
                name: curr.player_name,
                goals: currGoals,
                matches: parseInt(curr.matches) || 0,
                average: (parseInt(curr.matches) || 0) > 0 ? currGoals / (parseInt(curr.matches) || 1) : 0
            };
        }
        return prev;
    }, { name: 'Bilinmiyor', goals: 0, matches: 0, average: 0 });

    // En asistçi oyuncu (toplam asist sayısına göre)
    stats.topAssist = players.reduce((prev, curr) => {
        const currAssists = parseInt(curr.assists) || 0;
        const prevAssists = parseInt(prev.assists) || 0;

        if (currAssists > prevAssists) {
            return {
                name: curr.player_name,
                assists: currAssists,
                matches: parseInt(curr.matches) || 0,
                average: (parseInt(curr.matches) || 0) > 0 ? currAssists / (parseInt(curr.matches) || 1) : 0
            };
        }
        return prev;
    }, { name: 'Bilinmiyor', assists: 0, matches: 0, average: 0 });

    // Takım istatistiklerini hesapla
    players.forEach(player => {
        const matches = parseInt(player.matches) || 0;
        const goals = parseInt(player.goals) || 0;
        const assists = parseInt(player.assists) || 0;
        const shots = parseFloat(player.shots_per_match) * matches || 0;
        const shotsOnTarget = parseFloat(player.shots_on_target_per_match) * matches || 0;
        const passAccuracy = parseFloat(player.pass_accuracy) || 0;

        stats.totalGoals += goals;
        stats.totalAssists += assists;
        stats.totalShots += shots;
        stats.totalShotsOnTarget += shotsOnTarget;
        stats.passAccuracy += (passAccuracy * matches);
    });

    // Ortalama istatistikleri hesapla
    if (stats.totalMatches > 0) {
        stats.goalPerMatch = stats.totalGoals / stats.totalMatches;
        stats.assistPerMatch = stats.totalAssists / stats.totalMatches;
        stats.shotAccuracy = stats.totalShotsOnTarget / stats.totalShots * 100;
        stats.passAccuracy = stats.passAccuracy / stats.totalMatches;
        
        // Performans indeksi hesapla (0-100 arası)
        stats.performanceIndex = Math.min(100, (
            (stats.goalPerMatch * 25) +  // Gol etkisi
            (stats.assistPerMatch * 15) +  // Asist etkisi
            (stats.shotAccuracy * 0.3) +  // Şut isabeti etkisi
            (stats.passAccuracy * 0.3)    // Pas isabeti etkisi
        ));
    }

    return stats;
}

// Takım formunu hesapla
function calculateTeamForm(players) {
    const activePlayers = players.filter(p => parseInt(p.matches) > 0);
    const totalMatches = Math.max(...activePlayers.map(p => parseInt(p.matches)));
    const recentGoals = activePlayers.reduce((sum, p) => sum + parseInt(p.goals), 0) / totalMatches;
    const recentAssists = activePlayers.reduce((sum, p) => sum + parseInt(p.assists), 0) / totalMatches;
    return recentGoals + recentAssists;
}

// Pozisyonel güçleri karşılaştır
function comparePositionalStrengths(team1Players, team2Players, team1Name, team2Name) {
    const positions = ['Kaleci', 'Defans', 'Orta Saha', 'Forvet'];
    const analysis = [];

    positions.forEach(pos => {
        const team1Pos = team1Players.filter(p => p.position === pos);
        const team2Pos = team2Players.filter(p => p.position === pos);

        const team1Value = team1Pos.reduce((sum, p) => sum + parseInt(p.value), 0);
        const team2Value = team2Pos.reduce((sum, p) => sum + parseInt(p.value), 0);

        if (Math.abs(team1Value - team2Value) > 10000000) {
            const strongerTeam = team1Value > team2Value ? team1Name : team2Name;
            analysis.push(`${strongerTeam} ${pos.toLowerCase()} hattında daha güçlü`);
        }
    });

    return analysis;
}

// Pas verimliliği hesaplama
function calculatePassEfficiency(player) {
    return (parseFloat(player.pass_accuracy) * parseInt(player.matches)) / 100;
}

// En verimli pasör bulma
function findMostEfficientPasser(players) {
    return players.reduce((prev, curr) => {
        const prevEfficiency = calculatePassEfficiency(prev);
        const currEfficiency = calculatePassEfficiency(curr);
        return currEfficiency > prevEfficiency ? curr : prev;
    });
}