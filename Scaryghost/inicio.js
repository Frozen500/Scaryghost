// ==================== DADOS DO SISTEMA ====================
let boards = {
    his: { name: "/his/ - História", threads: [], posts: [] },
    b: { name: "/b/ - Aleatório", threads: [], posts: [] },
    tech: { name: "/tech/ - Tecnologia", threads: [], posts: [] },
    lit: { name: "/lit/ - Literatura", threads: [], posts: [] },
    art: { name: "/art/ - Arte", threads: [], posts: [] },
    wiki: { name: "/wiki/ - Enciclopédia", articles: [] }
};

let wikiArticles = JSON.parse(localStorage.getItem('anon_wiki')) || [];
let allThreads = JSON.parse(localStorage.getItem('anon_threads')) || [];
let allPosts = JSON.parse(localStorage.getItem('anon_posts')) || [];
let currentBoard = 'his';
let currentPage = 'home';
let currentThreadId = null;
let currentArticleId = null;

// ==================== FUNÇÕES DE UTILIDADE ====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function generateId() {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}

function getAuthorName(name) {
    if (name && name.trim()) {
        return name.trim();
    }
    return "Anônimo";
}

function getVisitorId() {
    let visitorId = localStorage.getItem('anon_visitor_id');
    if (!visitorId) {
        visitorId = 'vis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
        localStorage.setItem('anon_visitor_id', visitorId);
    }
    return visitorId;
}

// ==================== CARREGAR E SALVAR DADOS ====================
function loadData() {
    allThreads.forEach(thread => {
        if (boards[thread.board]) {
            boards[thread.board].threads.push(thread);
        }
        if (thread.votes === undefined) {
            thread.votes = { up: 0, down: 0, total: 0 };
            thread.userVotes = {};
        }
    });
    
    allPosts.forEach(post => {
        if (boards[post.board]) {
            if (!boards[post.board].posts) boards[post.board].posts = [];
            boards[post.board].posts.push(post);
        }
    });
    
    wikiArticles.forEach(article => {
        boards.wiki.articles.push(article);
    });
    
    updateStats();
}

function saveData() {
    localStorage.setItem('anon_threads', JSON.stringify(allThreads));
    localStorage.setItem('anon_posts', JSON.stringify(allPosts));
    localStorage.setItem('anon_wiki', JSON.stringify(wikiArticles));
    updateStats();
}

function updateStats() {
    const totalPosts = allPosts.length + allThreads.length;
    const totalThreads = allThreads.length;
    const totalWiki = wikiArticles.length;
    
    document.getElementById('statPosts').textContent = totalPosts;
    document.getElementById('statThreads').textContent = totalThreads;
    document.getElementById('statWiki').textContent = totalWiki;
    document.getElementById('sidebarPosts').textContent = totalPosts;
    document.getElementById('sidebarWiki').textContent = totalWiki;
    
    let visitors = parseInt(localStorage.getItem('anon_visitors') || '0');
    if (!localStorage.getItem('anon_visitor_registered')) {
        visitors++;
        localStorage.setItem('anon_visitors', visitors);
        localStorage.setItem('anon_visitor_registered', 'true');
    }
    document.getElementById('visitorCount').innerHTML = `👥 ${visitors} visitantes`;
    document.getElementById('sidebarVisitors').textContent = visitors;
    
    document.getElementById('boardStatsHis').textContent = boards.his.threads.length + ' tópicos';
    document.getElementById('boardStatsB').textContent = boards.b.threads.length + ' tópicos';
    document.getElementById('boardStatsTech').textContent = boards.tech.threads.length + ' tópicos';
    document.getElementById('boardStatsLit').textContent = boards.lit.threads.length + ' tópicos';
    document.getElementById('boardStatsArt').textContent = boards.art.threads.length + ' tópicos';
    document.getElementById('boardStatsWiki').textContent = wikiArticles.length + ' artigos';
}

// ==================== SISTEMA DE VOTOS ====================
function voteThread(threadId, voteType) {
    const thread = allThreads.find(t => t.id === threadId);
    if (!thread) return false;
    
    const visitorId = getVisitorId();
    
    if (!thread.userVotes) thread.userVotes = {};
    if (!thread.votes) thread.votes = { up: 0, down: 0, total: 0 };
    
    const previousVote = thread.userVotes[visitorId];
    
    if (previousVote === 'up') thread.votes.up--;
    if (previousVote === 'down') thread.votes.down--;
    
    if (voteType === 'up') {
        thread.votes.up++;
        thread.userVotes[visitorId] = 'up';
    } else if (voteType === 'down') {
        thread.votes.down++;
        thread.userVotes[visitorId] = 'down';
    } else {
        delete thread.userVotes[visitorId];
    }
    
    thread.votes.total = thread.votes.up - thread.votes.down;
    
    saveData();
    updateTrending();
    
    if (currentThreadId === threadId) {
        openThread(threadId);
    }
    if (currentPage === 'forum') {
        renderThreadList();
    }
    
    return true;
}

// ==================== FUNÇÕES DE ARQUIVO E APAGAR ====================
function archiveThread(threadId) {
    const threadIndex = allThreads.findIndex(t => t.id === threadId);
    if (threadIndex === -1) return false;
    
    const thread = allThreads[threadIndex];
    thread.isArchived = true;
    thread.archivedAt = new Date().toISOString();
    
    const boardIndex = boards[thread.board].threads.findIndex(t => t.id === threadId);
    if (boardIndex !== -1) boards[thread.board].threads.splice(boardIndex, 1);
    
    saveData();
    if (currentPage === 'forum') renderThreadList();
    alert('📦 Tópico arquivado com sucesso!');
    return true;
}

function deleteThread(threadId) {
    if (confirm('⚠️ Tem certeza que deseja APAGAR este tópico permanentemente?\n\nEsta ação não pode ser desfeita!')) {
        const threadIndex = allThreads.findIndex(t => t.id === threadId);
        if (threadIndex === -1) return false;
        
        const repliesToRemove = allPosts.filter(p => p.threadId === threadId);
        repliesToRemove.forEach(reply => {
            const replyIndex = allPosts.findIndex(p => p.id === reply.id);
            if (replyIndex !== -1) allPosts.splice(replyIndex, 1);
        });
        
        const thread = allThreads[threadIndex];
        const boardIndex = boards[thread.board].threads.findIndex(t => t.id === threadId);
        if (boardIndex !== -1) boards[thread.board].threads.splice(boardIndex, 1);
        
        allThreads.splice(threadIndex, 1);
        
        saveData();
        if (currentPage === 'forum') renderThreadList();
        document.getElementById('threadModal').style.display = 'none';
        alert('🗑️ Tópico apagado permanentemente!');
        return true;
    }
    return false;
}

// ==================== FUNÇÕES DO MENU ====================
function toggleThreadMenu(threadId) {
    const menu = document.getElementById(`menu-${threadId}`);
    document.querySelectorAll('.menu-dropdown').forEach(m => {
        if (m.id !== `menu-${threadId}`) m.classList.remove('show');
    });
    menu.classList.toggle('show');
}

// ==================== TRENDING ====================
function updateTrending() {
    const trendingContainer = document.getElementById('trendingList');
    
    const threadsWithScore = allThreads.map(thread => ({
        ...thread,
        score: (thread.votes?.total || 0) + (allPosts.filter(p => p.threadId === thread.id).length * 2)
    }));
    
    const topThreads = threadsWithScore.sort((a, b) => b.score - a.score).slice(0, 5);
    
    if (topThreads.length === 0) {
        trendingContainer.innerHTML = '<div class="trending-placeholder">Nenhum tópico em alta</div>';
        return;
    }
    
    trendingContainer.innerHTML = topThreads.map(thread => `
        <div class="trending-item" onclick="openThread('${thread.id}')">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>💬 ${escapeHtml(thread.title.substring(0, 40))}${thread.title.length > 40 ? '...' : ''}</span>
                <span style="color: #6a9fb5;">👍 ${thread.votes?.total || 0}</span>
            </div>
            <span style="font-size: 0.6rem;">${allPosts.filter(p => p.threadId === thread.id).length} respostas | ${thread.board}</span>
        </div>
    `).join('');
}

// ==================== FORUM ====================
function renderThreadList() {
    const container = document.getElementById('threadList');
    const threads = boards[currentBoard]?.threads || [];
    const visitorId = getVisitorId();
    
    if (threads.length === 0) {
        container.innerHTML = '<div class="loading">Nenhum tópico neste board. Seja o primeiro!</div>';
        return;
    }
    
    container.innerHTML = threads.map(thread => {
        const replies = allPosts.filter(p => p.threadId === thread.id).length;
        const userVote = thread.userVotes?.[visitorId];
        const voteTotal = thread.votes?.total || 0;
        
        return `
            <div class="thread-item" data-thread-id="${thread.id}" onclick="openThread('${thread.id}')">
                <div class="thread-header">
                    <span class="thread-title">${escapeHtml(thread.title)}</span>
                    <span class="thread-meta">#${thread.id.slice(-6)}</span>
                </div>
                <div class="thread-preview">${escapeHtml(thread.content.substring(0, 150))}${thread.content.length > 150 ? '...' : ''}</div>
                <div class="thread-stats">
                    <div class="vote-buttons" onclick="event.stopPropagation()">
                        <button class="vote-up ${userVote === 'up' ? 'voted-up' : ''}" onclick="voteThread('${thread.id}', 'up')">▲ ${thread.votes?.up || 0}</button>
                        <button class="vote-down ${userVote === 'down' ? 'voted-down' : ''}" onclick="voteThread('${thread.id}', 'down')">▼ ${thread.votes?.down || 0}</button>
                        <span class="vote-total ${voteTotal > 0 ? 'positive' : voteTotal < 0 ? 'negative' : ''}">${voteTotal > 0 ? '+' : ''}${voteTotal}</span>
                    </div>
                    <span>👤 ${escapeHtml(thread.author)}</span>
                    <span>💬 ${replies} respostas</span>
                    <span>📅 ${new Date(thread.createdAt).toLocaleDateString()}</span>
                    <div class="thread-menu" onclick="event.stopPropagation()">
                        <button class="menu-dots" onclick="toggleThreadMenu('${thread.id}')">⋮</button>
                        <div class="menu-dropdown" id="menu-${thread.id}">
                            <button onclick="archiveThread('${thread.id}')">📦 Arquivar</button>
                            <button onclick="deleteThread('${thread.id}')" class="delete-option">🗑️ Apagar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openThread(threadId) {
    currentThreadId = threadId;
    const thread = allThreads.find(t => t.id === threadId);
    if (!thread) return;
    
    const replies = allPosts.filter(p => p.threadId === threadId);
    const visitorId = getVisitorId();
    const userVote = thread.userVotes?.[visitorId];
    const voteTotal = thread.votes?.total || 0;
    
    document.getElementById('threadModalTitle').innerHTML = `
        ${escapeHtml(thread.title)}
        <span style="font-size:0.7rem;">/ ${boards[thread.board]?.name || 'Board'}</span>
        <div class="thread-votes-header">
            <button class="vote-up-header ${userVote === 'up' ? 'voted-up' : ''}" onclick="voteThread('${thread.id}', 'up')">▲ ${thread.votes?.up || 0}</button>
            <button class="vote-down-header ${userVote === 'down' ? 'voted-down' : ''}" onclick="voteThread('${thread.id}', 'down')">▼ ${thread.votes?.down || 0}</button>
            <span class="vote-total-header ${voteTotal > 0 ? 'positive' : voteTotal < 0 ? 'negative' : ''}">${voteTotal > 0 ? '+' : ''}${voteTotal}</span>
        </div>
    `;
    
    let content = `
        <div class="post">
            <div class="post-header">
                <span class="post-name">${escapeHtml(thread.author)}</span>
                <span>#OP • ${new Date(thread.createdAt).toLocaleString()}</span>
            </div>
            <div class="post-content">${escapeHtml(thread.content).replace(/\n/g, '<br>')}</div>
        </div>
    `;
    
    replies.forEach(reply => {
        content += `
            <div class="post">
                <div class="post-header">
                    <span class="post-name">${escapeHtml(reply.author)}</span>
                    <span>${new Date(reply.createdAt).toLocaleString()}</span>
                </div>
                <div class="post-content">${escapeHtml(reply.content).replace(/\n/g, '<br>')}</div>
            </div>
        `;
    });
    
    document.getElementById('threadModalContent').innerHTML = content;
    document.getElementById('threadModal').style.display = 'flex';
}

function createThread(board, title, content, authorName) {
    const author = getAuthorName(authorName);
    const newThread = {
        id: generateId(),
        board: board,
        title: title,
        content: content,
        author: author,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        votes: { up: 0, down: 0, total: 0 },
        userVotes: {}
    };
    
    allThreads.unshift(newThread);
    boards[board].threads.unshift(newThread);
    saveData();
    updateTrending();
    return newThread;
}

function createReply(threadId, content, authorName) {
    const thread = allThreads.find(t => t.id === threadId);
    if (!thread) return null;
    
    const author = getAuthorName(authorName);
    const newReply = {
        id: generateId(),
        threadId: threadId,
        board: thread.board,
        content: content,
        author: author,
        createdAt: new Date().toISOString()
    };
    
    allPosts.unshift(newReply);
    if (!boards[thread.board].posts) boards[thread.board].posts = [];
    boards[thread.board].posts.unshift(newReply);
    saveData();
    updateTrending();
    return newReply;
}

// ==================== WIKI ====================
function renderWikiArticles() {
    const container = document.getElementById('articleList');
    const searchTerm = document.getElementById('wikiSearch')?.value.toLowerCase() || '';
    
    let filtered = [...wikiArticles];
    if (searchTerm) {
        filtered = filtered.filter(a => 
            a.title.toLowerCase().includes(searchTerm) || 
            a.content.toLowerCase().includes(searchTerm)
        );
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="loading">Nenhum artigo encontrado. Crie o primeiro!</div>';
        return;
    }
    
    container.innerHTML = filtered.map(article => `
        <div class="article-item" onclick="openArticle('${article.id}')">
            <div class="article-title">📖 ${escapeHtml(article.title)}</div>
            <div class="article-meta">
                Categoria: ${article.category} | Criado por: ${escapeHtml(article.author)} | ${new Date(article.createdAt).toLocaleDateString()}
            </div>
        </div>
    `).join('');
}

function createArticle(title, category, content, authorName) {
    const author = getAuthorName(authorName);
    const newArticle = {
        id: generateId(),
        title: title,
        category: category,
        content: content,
        author: author,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    wikiArticles.unshift(newArticle);
    boards.wiki.articles.unshift(newArticle);
    saveData();
    renderWikiArticles();
    updateStats();
    return newArticle;
}

function updateArticle(articleId, title, category, content) {
    const index = wikiArticles.findIndex(a => a.id === articleId);
    if (index !== -1) {
        wikiArticles[index].title = title;
        wikiArticles[index].category = category;
        wikiArticles[index].content = content;
        wikiArticles[index].updatedAt = new Date().toISOString();
        
        const boardIndex = boards.wiki.articles.findIndex(a => a.id === articleId);
        if (boardIndex !== -1) boards.wiki.articles[boardIndex] = wikiArticles[index];
        
        saveData();
        renderWikiArticles();
    }
}

function openArticle(articleId) {
    currentArticleId = articleId;
    const article = wikiArticles.find(a => a.id === articleId);
    if (!article) return;
    
    document.getElementById('articleViewTitle').textContent = article.title;
    document.getElementById('articleViewContent').innerHTML = `
        <div style="margin-bottom: 15px; color: #6a6a6a; font-size: 0.8rem;">
            📂 Categoria: ${article.category} | ✍️ Autor: ${escapeHtml(article.author)} | 📅 ${new Date(article.createdAt).toLocaleDateString()}
        </div>
        <div style="line-height: 1.6;">${escapeHtml(article.content).replace(/\n/g, '<br>')}</div>
    `;
    document.getElementById('articleViewModal').style.display = 'flex';
}

// ==================== ARCHIVE ====================
function renderArchive() {
    const container = document.getElementById('archiveList');
    const archived = [...allThreads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    container.innerHTML = archived.map(thread => `
        <div class="archive-item">
            <div class="archive-title" onclick="openThread('${thread.id}')">
                ${escapeHtml(thread.title)}
            </div>
            <div class="archive-meta">
                /${thread.board}/ | ${escapeHtml(thread.author)} | ${new Date(thread.createdAt).toLocaleDateString()} | 👍 ${thread.votes?.total || 0}
            </div>
        </div>
    `).join('');
    
    if (archived.length === 0) {
        container.innerHTML = '<div class="loading">Nenhum tópico arquivado</div>';
    }
}

// ==================== QUICK POST ====================
function quickPost() {
    const board = document.getElementById('quickBoardSelect').value;
    const name = document.getElementById('quickName').value;
    const content = document.getElementById('quickContent').value.trim();
    
    if (!content) {
        alert('Digite uma mensagem!');
        return;
    }
    
    if (board === 'wiki') {
        document.getElementById('newArticleModal').style.display = 'flex';
        document.getElementById('quickContent').value = '';
        return;
    }
    
    const title = content.split('\n')[0].substring(0, 80);
    createThread(board, title, content, name);
    
    document.getElementById('quickContent').value = '';
    document.getElementById('quickName').value = '';
    
    alert('✅ Tópico criado!');
    if (currentPage === 'forum') renderThreadList();
}

// ==================== NAVEGAÇÃO ====================
function changePage(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page + 'Page').classList.add('active');
    
    document.querySelectorAll('.header-links a').forEach(link => link.classList.remove('active'));
    document.querySelector(`.header-links a[data-page="${page}"]`).classList.add('active');
    
    if (page === 'forum') {
        document.getElementById('forumTitle').textContent = boards[currentBoard]?.name || '/his/ - História';
        renderThreadList();
    } else if (page === 'wiki') {
        renderWikiArticles();
    } else if (page === 'archive') {
        renderArchive();
    }
}

function changeBoard(board) {
    currentBoard = board;
    if (currentPage === 'forum') {
        document.getElementById('forumTitle').textContent = boards[board]?.name || '/his/ - História';
        renderThreadList();
    }
}

// ==================== EVENTOS ====================
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    updateTrending();
    
    document.querySelectorAll('.header-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            changePage(link.dataset.page);
        });
    });
    
    document.querySelectorAll('.board-card').forEach(card => {
        card.addEventListener('click', () => {
            const board = card.dataset.board;
            if (board === 'wiki') {
                changePage('wiki');
            } else {
                currentBoard = board;
                changePage('forum');
            }
        });
    });
    
    document.getElementById('quickPostBtn').addEventListener('click', quickPost);
    
    document.getElementById('newThreadBtn').addEventListener('click', () => {
        document.getElementById('newThreadModal').style.display = 'flex';
    });
    
    document.getElementById('closeThreadModal').addEventListener('click', () => {
        document.getElementById('newThreadModal').style.display = 'none';
    });
    
    document.getElementById('submitThreadBtn').addEventListener('click', () => {
        const title = document.getElementById('threadTitle').value.trim();
        const name = document.getElementById('threadName').value;
        const content = document.getElementById('threadContent').value.trim();
        
        if (!title || !content) {
            alert('Preencha título e mensagem!');
            return;
        }
        
        createThread(currentBoard, title, content, name);
        document.getElementById('newThreadModal').style.display = 'none';
        document.getElementById('threadTitle').value = '';
        document.getElementById('threadName').value = '';
        document.getElementById('threadContent').value = '';
        renderThreadList();
        alert('✅ Tópico criado!');
    });
    
    document.getElementById('newArticleBtn').addEventListener('click', () => {
        document.getElementById('newArticleModal').style.display = 'flex';
    });
    
    document.getElementById('closeArticleModal').addEventListener('click', () => {
        document.getElementById('newArticleModal').style.display = 'none';
    });
    
    document.getElementById('submitArticleBtn').addEventListener('click', () => {
        const title = document.getElementById('articleTitle').value.trim();
        const category = document.getElementById('articleCategory').value;
        const content = document.getElementById('articleContent').value.trim();
        const name = document.getElementById('quickName').value;
        
        if (!title || !content) {
            alert('Preencha título e conteúdo!');
            return;
        }
        
        createArticle(title, category, content, name);
        document.getElementById('newArticleModal').style.display = 'none';
        document.getElementById('articleTitle').value = '';
        document.getElementById('articleContent').value = '';
        renderWikiArticles();
        alert('✅ Artigo criado!');
    });
    
    document.getElementById('wikiSearchBtn').addEventListener('click', renderWikiArticles);
    document.getElementById('wikiSearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') renderWikiArticles();
    });
    
    document.getElementById('submitReplyBtn').addEventListener('click', () => {
        const content = document.getElementById('replyContent').value.trim();
        const name = document.getElementById('replyName').value;
        
        if (!content) {
            alert('Digite sua resposta!');
            return;
        }
        
        createReply(currentThreadId, content, name);
        document.getElementById('replyContent').value = '';
        document.getElementById('replyName').value = '';
        openThread(currentThreadId);
    });
    
    document.getElementById('closeThreadViewModal').addEventListener('click', () => {
        document.getElementById('threadModal').style.display = 'none';
    });
    
    document.getElementById('closeArticleViewModal').addEventListener('click', () => {
        document.getElementById('articleViewModal').style.display = 'none';
    });
    
    document.getElementById('closeEditArticleModal').addEventListener('click', () => {
        document.getElementById('editArticleModal').style.display = 'none';
    });
    
    document.getElementById('editArticleBtn').addEventListener('click', () => {
        const article = wikiArticles.find(a => a.id === currentArticleId);
        if (article) {
            document.getElementById('editArticleTitle').value = article.title;
            document.getElementById('editArticleCategory').innerHTML = `
                <option value="historia" ${article.category === 'historia' ? 'selected' : ''}>História</option>
                <option value="tecnologia" ${article.category === 'tecnologia' ? 'selected' : ''}>Tecnologia</option>
                <option value="ciencia" ${article.category === 'ciencia' ? 'selected' : ''}>Ciência</option>
                <option value="arte" ${article.category === 'arte' ? 'selected' : ''}>Arte</option>
                <option value="literatura" ${article.category === 'literatura' ? 'selected' : ''}>Literatura</option>
                <option value="geral" ${article.category === 'geral' ? 'selected' : ''}>Geral</option>
            `;
            document.getElementById('editArticleContent').value = article.content;
            document.getElementById('editArticleModal').style.display = 'flex';
        }
    });
    
    document.getElementById('saveArticleEditBtn').addEventListener('click', () => {
        const title = document.getElementById('editArticleTitle').value.trim();
        const category = document.getElementById('editArticleCategory').value;
        const content = document.getElementById('editArticleContent').value.trim();
        
        if (!title || !content) {
            alert('Preencha título e conteúdo!');
            return;
        }
        
        updateArticle(currentArticleId, title, category, content);
        document.getElementById('editArticleModal').style.display = 'none';
        openArticle(currentArticleId);
        alert('✅ Artigo atualizado!');
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    document.addEventListener('click', function(e) {
        if (!e.target.classList.contains('menu-dots')) {
            document.querySelectorAll('.menu-dropdown').forEach(m => m.classList.remove('show'));
        }
    });
    
    updateStats();
});

// Expor funções globalmente
window.openThread = openThread;
window.openArticle = openArticle;
window.voteThread = voteThread;
window.archiveThread = archiveThread;
window.deleteThread = deleteThread;
window.toggleThreadMenu = toggleThreadMenu;
window.getVisitorId = getVisitorId;