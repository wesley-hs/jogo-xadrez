class Chess {
    constructor() {
        this.board = [];
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.possibleMoves = [];
        this.gameHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.kings = { white: null, black: null };
        this.gameOver = false;
        this.enPassantTarget = null;
        this.castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        
        // Configurações da IA
        this.gameMode = 'player'; // 'player' ou 'ai'
        this.aiColor = 'black';
        this.aiDifficulty = 'medium'; // 'easy', 'medium', 'hard'
        this.aiThinking = false;
        
        this.pieceSymbols = {
            white: {
                king: '♔', queen: '♕', rook: '♖',
                bishop: '♗', knight: '♘', pawn: '♙'
            },
            black: {
                king: '♚', queen: '♛', rook: '♜',
                bishop: '♝', knight: '♞', pawn: '♟'
            }
        };
        
        this.initializeBoard();
        this.setupEventListeners();
        this.renderBoard();
        this.updateUI();
    }

    initializeBoard() {
        // Inicializar tabuleiro vazio
        for (let row = 0; row < 8; row++) {
            this.board[row] = [];
            for (let col = 0; col < 8; col++) {
                this.board[row][col] = null;
            }
        }

        // Configurar peças pretas
        this.board[0] = [
            {type: 'rook', color: 'black'},
            {type: 'knight', color: 'black'},
            {type: 'bishop', color: 'black'},
            {type: 'queen', color: 'black'},
            {type: 'king', color: 'black'},
            {type: 'bishop', color: 'black'},
            {type: 'knight', color: 'black'},
            {type: 'rook', color: 'black'}
        ];

        for (let col = 0; col < 8; col++) {
            this.board[1][col] = {type: 'pawn', color: 'black'};
        }

        // Configurar peças brancas
        for (let col = 0; col < 8; col++) {
            this.board[6][col] = {type: 'pawn', color: 'white'};
        }

        this.board[7] = [
            {type: 'rook', color: 'white'},
            {type: 'knight', color: 'white'},
            {type: 'bishop', color: 'white'},
            {type: 'queen', color: 'white'},
            {type: 'king', color: 'white'},
            {type: 'bishop', color: 'white'},
            {type: 'knight', color: 'white'},
            {type: 'rook', color: 'white'}
        ];

        // Localizar reis
        this.kings.white = {row: 7, col: 4};
        this.kings.black = {row: 0, col: 4};
    }

    setupEventListeners() {
        // Elementos básicos
        const newGameBtn = document.getElementById('new-game-btn');
        const undoBtn = document.getElementById('undo-btn');
        const hintBtn = document.getElementById('hint-btn');
        
        if (newGameBtn) newGameBtn.addEventListener('click', () => this.newGame());
        if (undoBtn) undoBtn.addEventListener('click', () => this.undoMove());
        if (hintBtn) hintBtn.addEventListener('click', () => this.showHint());
        
        // Elementos da IA
        const aiToggleBtn = document.getElementById('ai-toggle-btn');
        const difficultySelect = document.getElementById('difficulty-select');
        
        if (aiToggleBtn) {
            aiToggleBtn.addEventListener('click', () => this.toggleAI());
        }
        
        if (difficultySelect) {
            difficultySelect.addEventListener('change', (e) => {
                this.aiDifficulty = e.target.value;
                this.updateGameModeUI(); // Atualizar UI quando dificuldade mudar
            });
        }
    }

    renderBoard() {
        const boardElement = document.getElementById('chess-board');
        boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.board[row][col];
                if (piece) {
                    square.textContent = this.pieceSymbols[piece.color][piece.type];
                    square.classList.add('piece');
                }

                square.addEventListener('click', (e) => this.handleSquareClick(e));
                boardElement.appendChild(square);
            }
        }
    }

    handleSquareClick(event) {
        if (this.gameOver || this.aiThinking) return;
        
        // Se for o turno da IA, não permitir cliques
        if (this.gameMode === 'ai' && this.currentPlayer === this.aiColor) return;

        const row = parseInt(event.target.dataset.row);
        const col = parseInt(event.target.dataset.col);
        const piece = this.board[row][col];

        // Se já há uma peça selecionada
        if (this.selectedSquare) {
            // Se clicou na mesma peça, desselecionar
            if (this.selectedSquare.row === row && this.selectedSquare.col === col) {
                this.clearSelection();
                return;
            }

            // Tentar fazer o movimento
            if (this.isValidMove(this.selectedSquare.row, this.selectedSquare.col, row, col)) {
                this.makeMove(this.selectedSquare.row, this.selectedSquare.col, row, col);
                return;
            }

            // Se clicou em outra peça da mesma cor, selecionar nova peça
            if (piece && piece.color === this.currentPlayer) {
                this.selectSquare(row, col);
                return;
            }

            this.clearSelection();
        } else {
            // Selecionar peça se for do jogador atual
            if (piece && piece.color === this.currentPlayer) {
                this.selectSquare(row, col);
            }
        }
    }

    selectSquare(row, col) {
        this.selectedSquare = {row, col};
        this.possibleMoves = this.getPossibleMoves(row, col);
        this.highlightSquares();
    }

    clearSelection() {
        this.selectedSquare = null;
        this.possibleMoves = [];
        this.clearHighlights();
    }

    highlightSquares() {
        this.clearHighlights();
        
        // Destacar peça selecionada
        const selectedElement = document.querySelector(`[data-row="${this.selectedSquare.row}"][data-col="${this.selectedSquare.col}"]`);
        selectedElement.classList.add('selected');

        // Destacar movimentos possíveis
        this.possibleMoves.forEach(move => {
            const element = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
            if (this.board[move.row][move.col]) {
                element.classList.add('capture-move');
            } else {
                element.classList.add('possible-move');
            }
        });
    }

    clearHighlights() {
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('selected', 'possible-move', 'capture-move', 'last-move');
        });
    }

    getPossibleMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece || piece.color !== this.currentPlayer) return [];

        let moves = [];

        switch (piece.type) {
            case 'pawn':
                moves = this.getPawnMoves(row, col);
                break;
            case 'rook':
                moves = this.getRookMoves(row, col);
                break;
            case 'knight':
                moves = this.getKnightMoves(row, col);
                break;
            case 'bishop':
                moves = this.getBishopMoves(row, col);
                break;
            case 'queen':
                moves = this.getQueenMoves(row, col);
                break;
            case 'king':
                moves = this.getKingMoves(row, col);
                break;
        }

        // Filtrar movimentos que deixariam o rei em xeque
        return moves.filter(move => !this.wouldBeInCheck(row, col, move.row, move.col));
    }

    getPawnMoves(row, col) {
        const moves = [];
        const piece = this.board[row][col];
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;

        // Movimento para frente
        if (this.isInBounds(row + direction, col) && !this.board[row + direction][col]) {
            moves.push({row: row + direction, col});

            // Movimento duplo inicial
            if (row === startRow && !this.board[row + 2 * direction][col]) {
                moves.push({row: row + 2 * direction, col});
            }
        }

        // Capturas diagonais
        [-1, 1].forEach(colOffset => {
            const newRow = row + direction;
            const newCol = col + colOffset;
            
            if (this.isInBounds(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (target && target.color !== piece.color) {
                    moves.push({row: newRow, col: newCol});
                }

                // En passant
                if (this.enPassantTarget && 
                    this.enPassantTarget.row === newRow && 
                    this.enPassantTarget.col === newCol) {
                    moves.push({row: newRow, col: newCol, isEnPassant: true});
                }
            }
        });

        return moves;
    }

    getRookMoves(row, col) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        directions.forEach(([dRow, dCol]) => {
            for (let i = 1; i < 8; i++) {
                const newRow = row + i * dRow;
                const newCol = col + i * dCol;

                if (!this.isInBounds(newRow, newCol)) break;

                const target = this.board[newRow][newCol];
                if (!target) {
                    moves.push({row: newRow, col: newCol});
                } else {
                    if (target.color !== this.board[row][col].color) {
                        moves.push({row: newRow, col: newCol});
                    }
                    break;
                }
            }
        });

        return moves;
    }

    getKnightMoves(row, col) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        knightMoves.forEach(([dRow, dCol]) => {
            const newRow = row + dRow;
            const newCol = col + dCol;

            if (this.isInBounds(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (!target || target.color !== this.board[row][col].color) {
                    moves.push({row: newRow, col: newCol});
                }
            }
        });

        return moves;
    }

    getBishopMoves(row, col) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

        directions.forEach(([dRow, dCol]) => {
            for (let i = 1; i < 8; i++) {
                const newRow = row + i * dRow;
                const newCol = col + i * dCol;

                if (!this.isInBounds(newRow, newCol)) break;

                const target = this.board[newRow][newCol];
                if (!target) {
                    moves.push({row: newRow, col: newCol});
                } else {
                    if (target.color !== this.board[row][col].color) {
                        moves.push({row: newRow, col: newCol});
                    }
                    break;
                }
            }
        });

        return moves;
    }

    getQueenMoves(row, col) {
        return [...this.getRookMoves(row, col), ...this.getBishopMoves(row, col)];
    }

    getKingMoves(row, col) {
        const moves = [];
        const kingMoves = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        kingMoves.forEach(([dRow, dCol]) => {
            const newRow = row + dRow;
            const newCol = col + dCol;

            if (this.isInBounds(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (!target || target.color !== this.board[row][col].color) {
                    moves.push({row: newRow, col: newCol});
                }
            }
        });

        // Roque
        const castlingMoves = this.getCastlingMoves(row, col);
        moves.push(...castlingMoves);

        return moves;
    }

    getCastlingMoves(row, col) {
        const moves = [];
        const piece = this.board[row][col];
        
        if (piece.type !== 'king' || this.isInCheck(piece.color)) {
            return moves;
        }

        const color = piece.color;
        const rights = this.castlingRights[color];

        // Roque pequeno (lado do rei)
        if (rights.kingside) {
            if (!this.board[row][5] && !this.board[row][6]) {
                if (!this.wouldBeInCheck(row, col, row, 5) && !this.wouldBeInCheck(row, col, row, 6)) {
                    moves.push({row, col: 6, isCastling: true, side: 'kingside'});
                }
            }
        }

        // Roque grande (lado da rainha)
        if (rights.queenside) {
            if (!this.board[row][1] && !this.board[row][2] && !this.board[row][3]) {
                if (!this.wouldBeInCheck(row, col, row, 3) && !this.wouldBeInCheck(row, col, row, 2)) {
                    moves.push({row, col: 2, isCastling: true, side: 'queenside'});
                }
            }
        }

        return moves;
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        return this.possibleMoves.some(move => move.row === toRow && move.col === toCol);
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        const move = this.possibleMoves.find(m => m.row === toRow && m.col === toCol);

        // Salvar estado para histórico
        const gameState = {
            board: this.board.map(row => [...row]),
            currentPlayer: this.currentPlayer,
            capturedPieces: {
                white: [...this.capturedPieces.white],
                black: [...this.capturedPieces.black]
            },
            kings: {...this.kings},
            castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
            enPassantTarget: this.enPassantTarget
        };

        // Executar movimento
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        // Atualizar posição do rei
        if (piece.type === 'king') {
            this.kings[piece.color] = {row: toRow, col: toCol};
        }

        // Tratar movimentos especiais
        if (move && move.isEnPassant) {
            const capturedPawnRow = piece.color === 'white' ? toRow + 1 : toRow - 1;
            const capturedPawn = this.board[capturedPawnRow][toCol];
            this.capturedPieces[capturedPawn.color].push(capturedPawn);
            this.board[capturedPawnRow][toCol] = null;
        }

        if (move && move.isCastling) {
            this.executeCastling(toRow, toCol, move.side);
        }

        // Captura normal
        if (capturedPiece && (!move || !move.isEnPassant)) {
            this.capturedPieces[capturedPiece.color].push(capturedPiece);
        }

        // Atualizar direitos de roque
        this.updateCastlingRights(piece, fromRow, fromCol);

        // Atualizar en passant
        this.updateEnPassant(piece, fromRow, fromCol, toRow, toCol);

        // Promoção de peão
        if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
            this.handlePawnPromotion(toRow, toCol);
        }

        // Salvar no histórico
        this.gameHistory.push(gameState);

        // Mudar turno
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        // Atualizar interface
        this.clearSelection();
        this.renderBoard();
        this.updateUI();
        this.checkGameEnd();
        
        console.log('🎮 Após movimento - gameMode:', this.gameMode, 'currentPlayer:', this.currentPlayer, 'aiColor:', this.aiColor, 'aiThinking:', this.aiThinking);
        
        // Se for modo IA e agora é o turno da IA, fazer movimento (mas não se já estiver pensando)
        if (this.gameMode === 'ai' && this.currentPlayer === this.aiColor && !this.gameOver && !this.aiThinking) {
            console.log('🤖 Chamando IA após movimento do jogador');
            setTimeout(() => this.makeAIMove(), 100); // Pequeno delay para garantir que a UI atualize
        } else {
            console.log('⏸️ Não chamando IA:', {
                gameMode: this.gameMode,
                isAITurn: this.currentPlayer === this.aiColor,
                gameOver: this.gameOver,
                aiThinking: this.aiThinking
            });
        }
    }

    executeCastling(kingRow, kingCol, side) {
        if (side === 'kingside') {
            // Mover torre
            this.board[kingRow][5] = this.board[kingRow][7];
            this.board[kingRow][7] = null;
        } else {
            // Mover torre
            this.board[kingRow][3] = this.board[kingRow][0];
            this.board[kingRow][0] = null;
        }
    }

    updateCastlingRights(piece, fromRow, fromCol) {
        if (piece.type === 'king') {
            this.castlingRights[piece.color].kingside = false;
            this.castlingRights[piece.color].queenside = false;
        }

        if (piece.type === 'rook') {
            if (fromCol === 0) {
                this.castlingRights[piece.color].queenside = false;
            } else if (fromCol === 7) {
                this.castlingRights[piece.color].kingside = false;
            }
        }
    }

    updateEnPassant(piece, fromRow, fromCol, toRow, toCol) {
        this.enPassantTarget = null;

        if (piece.type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
            this.enPassantTarget = {
                row: fromRow + (toRow - fromRow) / 2,
                col: toCol
            };
        }
    }

    handlePawnPromotion(row, col) {
        // Por simplicidade, promover automaticamente para rainha
        // Em uma versão mais completa, você pode mostrar um modal para escolha
        this.board[row][col] = {
            type: 'queen',
            color: this.board[row][col].color
        };
    }

    wouldBeInCheck(fromRow, fromCol, toRow, toCol) {
        // Simular movimento
        const originalPiece = this.board[toRow][toCol];
        const movingPiece = this.board[fromRow][fromCol];
        
        this.board[toRow][toCol] = movingPiece;
        this.board[fromRow][fromCol] = null;

        // Atualizar posição do rei temporariamente
        let tempKingPos = null;
        if (movingPiece.type === 'king') {
            tempKingPos = this.kings[movingPiece.color];
            this.kings[movingPiece.color] = {row: toRow, col: toCol};
        }

        const inCheck = this.isInCheck(movingPiece.color);

        // Restaurar tabuleiro
        this.board[fromRow][fromCol] = movingPiece;
        this.board[toRow][toCol] = originalPiece;

        if (tempKingPos) {
            this.kings[movingPiece.color] = tempKingPos;
        }

        return inCheck;
    }

    isInCheck(color) {
        const kingPos = this.kings[color];
        const opponentColor = color === 'white' ? 'black' : 'white';

        // Verificar se alguma peça adversária pode atacar o rei
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === opponentColor) {
                    if (this.canAttack(row, col, kingPos.row, kingPos.col)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    canAttack(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        if (!piece) return false;

        switch (piece.type) {
            case 'pawn':
                return this.canPawnAttack(fromRow, fromCol, toRow, toCol);
            case 'rook':
                return this.canRookAttack(fromRow, fromCol, toRow, toCol);
            case 'knight':
                return this.canKnightAttack(fromRow, fromCol, toRow, toCol);
            case 'bishop':
                return this.canBishopAttack(fromRow, fromCol, toRow, toCol);
            case 'queen':
                return this.canQueenAttack(fromRow, fromCol, toRow, toCol);
            case 'king':
                return this.canKingAttack(fromRow, fromCol, toRow, toCol);
        }

        return false;
    }

    canPawnAttack(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const direction = piece.color === 'white' ? -1 : 1;
        
        return toRow === fromRow + direction && Math.abs(toCol - fromCol) === 1;
    }

    canRookAttack(fromRow, fromCol, toRow, toCol) {
        if (fromRow !== toRow && fromCol !== toCol) return false;
        return this.isPathClear(fromRow, fromCol, toRow, toCol);
    }

    canKnightAttack(fromRow, fromCol, toRow, toCol) {
        const dRow = Math.abs(toRow - fromRow);
        const dCol = Math.abs(toCol - fromCol);
        return (dRow === 2 && dCol === 1) || (dRow === 1 && dCol === 2);
    }

    canBishopAttack(fromRow, fromCol, toRow, toCol) {
        if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;
        return this.isPathClear(fromRow, fromCol, toRow, toCol);
    }

    canQueenAttack(fromRow, fromCol, toRow, toCol) {
        return this.canRookAttack(fromRow, fromCol, toRow, toCol) || 
               this.canBishopAttack(fromRow, fromCol, toRow, toCol);
    }

    canKingAttack(fromRow, fromCol, toRow, toCol) {
        return Math.abs(toRow - fromRow) <= 1 && Math.abs(toCol - fromCol) <= 1;
    }

    isPathClear(fromRow, fromCol, toRow, toCol) {
        const dRow = toRow - fromRow;
        const dCol = toCol - fromCol;
        const steps = Math.max(Math.abs(dRow), Math.abs(dCol));
        
        if (steps === 0) return true;

        const stepRow = dRow === 0 ? 0 : dRow / Math.abs(dRow);
        const stepCol = dCol === 0 ? 0 : dCol / Math.abs(dCol);

        for (let i = 1; i < steps; i++) {
            const checkRow = fromRow + i * stepRow;
            const checkCol = fromCol + i * stepCol;
            if (this.board[checkRow][checkCol]) {
                return false;
            }
        }

        return true;
    }

    checkGameEnd() {
        const hasLegalMoves = this.hasLegalMoves(this.currentPlayer);
        const inCheck = this.isInCheck(this.currentPlayer);

        if (!hasLegalMoves) {
            if (inCheck) {
                this.gameOver = true;
                const winner = this.currentPlayer === 'white' ? 'Pretas' : 'Brancas';
                document.getElementById('game-status').textContent = `Xeque-mate! ${winner} vencem!`;
                document.querySelector('.game-container').classList.add('game-over');
            } else {
                this.gameOver = true;
                document.getElementById('game-status').textContent = 'Empate por afogamento!';
                document.querySelector('.game-container').classList.add('game-over');
            }
        } else if (inCheck) {
            document.getElementById('game-status').textContent = 'Xeque!';
            this.highlightKingInCheck();
        } else {
            document.getElementById('game-status').textContent = 'Jogo em andamento';
        }
    }

    hasLegalMoves(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const moves = this.getPossibleMoves(row, col);
                    if (moves.length > 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    highlightKingInCheck() {
        const kingPos = this.kings[this.currentPlayer];
        const kingElement = document.querySelector(`[data-row="${kingPos.row}"][data-col="${kingPos.col}"]`);
        kingElement.classList.add('in-check');
    }

    isInBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    updateUI() {
        // Atualizar indicador de turno
        let turnText;
        if (this.gameMode === 'ai') {
            if (this.currentPlayer === this.aiColor) {
                turnText = this.aiThinking ? 'IA pensando...' : `Vez da IA (${this.aiColor === 'white' ? 'Brancas' : 'Pretas'})`;
            } else {
                turnText = `Sua vez (${this.currentPlayer === 'white' ? 'Brancas' : 'Pretas'})`;
            }
        } else {
            turnText = this.currentPlayer === 'white' ? 'Vez das Brancas' : 'Vez das Pretas';
        }
        document.getElementById('current-turn').textContent = turnText;
        
        const turnIndicator = document.querySelector('.turn-indicator');
        turnIndicator.style.backgroundColor = this.currentPlayer === 'white' ? '#4CAF50' : '#333';

        // Atualizar peças capturadas
        this.updateCapturedPieces();

        // Atualizar histórico
        this.updateMoveHistory();
    }

    updateCapturedPieces() {
        const whiteCaptured = document.getElementById('captured-white-pieces');
        const blackCaptured = document.getElementById('captured-black-pieces');

        whiteCaptured.innerHTML = '';
        blackCaptured.innerHTML = '';

        this.capturedPieces.white.forEach(piece => {
            const pieceElement = document.createElement('div');
            pieceElement.className = 'captured-piece';
            pieceElement.textContent = this.pieceSymbols.white[piece.type];
            whiteCaptured.appendChild(pieceElement);
        });

        this.capturedPieces.black.forEach(piece => {
            const pieceElement = document.createElement('div');
            pieceElement.className = 'captured-piece';
            pieceElement.textContent = this.pieceSymbols.black[piece.type];
            blackCaptured.appendChild(pieceElement);
        });
    }

    updateMoveHistory() {
        const historyElement = document.getElementById('move-history');
        historyElement.innerHTML = '';

        this.gameHistory.forEach((_, index) => {
            const moveElement = document.createElement('div');
            moveElement.className = 'move-item';
            moveElement.textContent = `Movimento ${index + 1}`;
            historyElement.appendChild(moveElement);
        });
    }

    newGame() {
        this.board = [];
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.possibleMoves = [];
        this.gameHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.kings = { white: null, black: null };
        this.gameOver = false;
        this.enPassantTarget = null;
        this.castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        this.aiThinking = false;

        document.querySelector('.game-container').classList.remove('game-over');
        
        this.initializeBoard();
        this.renderBoard();
        this.updateUI();
        this.updateGameModeUI();
        
        // Se for modo IA e começar com a IA, fazer primeiro movimento
        if (this.gameMode === 'ai' && this.currentPlayer === this.aiColor) {
            this.makeAIMove();
        }
    }

    undoMove() {
        if (this.gameHistory.length === 0) return;

        const previousState = this.gameHistory.pop();
        
        this.board = previousState.board;
        this.currentPlayer = previousState.currentPlayer;
        this.capturedPieces = previousState.capturedPieces;
        this.kings = previousState.kings;
        this.castlingRights = previousState.castlingRights;
        this.enPassantTarget = previousState.enPassantTarget;
        this.gameOver = false;

        document.querySelector('.game-container').classList.remove('game-over');
        
        this.clearSelection();
        this.renderBoard();
        this.updateUI();
    }

    showHint() {
        if (this.gameOver) return;

        // Encontrar uma peça que pode se mover
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === this.currentPlayer) {
                    const moves = this.getPossibleMoves(row, col);
                    if (moves.length > 0) {
                        this.selectSquare(row, col);
                        return;
                    }
                }
            }
        }
    }

    // ===== MÉTODOS DA IA =====
    
    toggleAI() {
        console.log('🔄 toggleAI chamado - gameMode atual:', this.gameMode);
        
        this.gameMode = this.gameMode === 'player' ? 'ai' : 'player';
        this.updateGameModeUI();
        
        if (this.gameMode === 'ai') {
            this.aiColor = this.currentPlayer === 'white' ? 'black' : 'white';
            console.log('✅ Modo IA ativado - aiColor:', this.aiColor, 'currentPlayer:', this.currentPlayer);
            
            // Se for o turno da IA, fazer movimento
            if (this.currentPlayer === this.aiColor && !this.gameOver) {
                console.log('🚀 Chamando makeAIMove imediatamente');
                setTimeout(() => this.makeAIMove(), 100); // Pequeno delay para garantir que a UI atualize
            } else {
                console.log('⏳ Aguardando vez da IA');
            }
        } else {
            console.log('👥 Modo 2 jogadores ativado');
        }
    }

    updateGameModeUI() {
        const aiToggleBtn = document.getElementById('ai-toggle-btn');
        const difficultyContainer = document.querySelector('.difficulty-container');
        
        if (this.gameMode === 'ai') {
            aiToggleBtn.textContent = '👥 Jogar 2 Jogadores';
            aiToggleBtn.classList.add('ai-active');
            
            // Aplicar efeito especial para God Mode
            if (this.aiDifficulty === 'godmode') {
                aiToggleBtn.classList.add('godmode-active');
                aiToggleBtn.textContent = '👑 GOD MODE ATIVO';
            } else {
                aiToggleBtn.classList.remove('godmode-active');
            }
            
            difficultyContainer.style.display = 'block';
        } else {
            aiToggleBtn.textContent = '🤖 Jogar vs IA';
            aiToggleBtn.classList.remove('ai-active', 'godmode-active');
            difficultyContainer.style.display = 'none';
        }
    }

    makeAIMove() {
        if (this.gameOver || this.currentPlayer !== this.aiColor) {
            return;
        }
        
        this.aiThinking = true;
        document.getElementById('game-status').textContent = 'IA pensando...';
        
        try {
            const bestMove = this.getBestMove();
            
            if (bestMove) {
                // Definir os movimentos possíveis para a peça antes de fazer o movimento
                this.selectedSquare = {row: bestMove.fromRow, col: bestMove.fromCol};
                this.possibleMoves = this.getPossibleMoves(bestMove.fromRow, bestMove.fromCol);
                
                this.makeMove(bestMove.fromRow, bestMove.fromCol, bestMove.toRow, bestMove.toCol);
            } else {
                console.log('❌ IA: Nenhum movimento válido encontrado');
                document.getElementById('game-status').textContent = 'IA não encontrou movimento válido';
            }
        } catch (error) {
            console.error('💥 Erro na IA:', error);
            document.getElementById('game-status').textContent = 'Erro na IA';
        }
        
        this.aiThinking = false;
    }

    getBestMove() {
        console.log('🎯 getBestMove iniciado para:', this.aiColor);
        
        try {
            const allMoves = this.getAllPossibleMoves(this.aiColor);
            console.log('📋 Movimentos disponíveis:', allMoves.length, 'para', this.aiColor);
            
            if (allMoves.length === 0) {
                console.log('❌ Nenhum movimento disponível');
                return null;
            }
            
            // Aplicar filtro anti-repetição antes de escolher
            const filteredMoves = this.filterRepetitiveMoves(allMoves);
            const movesToAnalyze = filteredMoves.length > 0 ? filteredMoves : allMoves;
            console.log('🔍 Analisando', movesToAnalyze.length, 'movimentos na dificuldade:', this.aiDifficulty);
            
            let bestMove;
            switch (this.aiDifficulty) {
                case 'easy':
                    bestMove = this.getRandomMove(movesToAnalyze);
                    break;
                case 'medium':
                    bestMove = this.getMediumMove(movesToAnalyze);
                    break;
                case 'hard':
                    bestMove = this.getHardMove(movesToAnalyze);
                    break;
                case 'extreme':
                    bestMove = this.getExtremeMove(movesToAnalyze);
                    break;
                case 'godmode':
                    bestMove = this.getGodModeMove(movesToAnalyze);
                    break;
                default:
                    bestMove = this.getRandomMove(movesToAnalyze);
                    break;
            }
            
            console.log('✅ Movimento selecionado:', bestMove);
            return bestMove;
        } catch (error) {
            console.error('💥 Erro em getBestMove:', error);
            // Fallback para movimento aleatório em caso de erro
            const allMoves = this.getAllPossibleMoves(this.aiColor);
            return allMoves.length > 0 ? this.getRandomMove(allMoves) : null;
        }
    }

    filterRepetitiveMoves(moves) {
        // Criar mapa de peças usadas recentemente
        const pieceUsageCount = new Map();
        
        // Contar quantas vezes cada peça foi usada nas últimas jogadas
        let aiMoveCount = 0;
        for (let i = this.gameHistory.length - 1; i >= 0 && aiMoveCount < 4; i--) {
            const state = this.gameHistory[i];
            if (state.currentPlayer !== this.aiColor) { // Era turno da IA
                aiMoveCount++;
                // Encontrar a peça que foi movida (implementação simplificada)
                // Vamos assumir que a peça mais provável de ter sido movida é a que mudou de posição
            }
        }
        
        // Priorizar movimentos de peças menos usadas
        const movesByPiece = new Map();
        moves.forEach(move => {
            const pieceKey = `${move.piece.type}-${move.fromRow}-${move.fromCol}`;
            if (!movesByPiece.has(pieceKey)) {
                movesByPiece.set(pieceKey, []);
            }
            movesByPiece.get(pieceKey).push(move);
        });
        
        // Se uma peça tem muitos movimentos disponíveis, pode estar sendo super utilizada
        const balancedMoves = [];
        const maxMovesPerPiece = Math.max(2, Math.floor(moves.length / 4));
        
        movesByPiece.forEach((pieceMoves, pieceKey) => {
            // Limitar quantos movimentos consideramos por peça
            const selectedMoves = pieceMoves.slice(0, maxMovesPerPiece);
            balancedMoves.push(...selectedMoves);
        });
        
        return balancedMoves;
    }

    getAllPossibleMoves(color) {
        console.log('🔍 getAllPossibleMoves para:', color);
        const moves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    try {
                        const pieceMoves = this.getPossibleMoves(row, col);
                        pieceMoves.forEach(move => {
                            moves.push({
                                fromRow: row,
                                fromCol: col,
                                toRow: move.row,
                                toCol: move.col,
                                piece: piece,
                                capturedPiece: this.board[move.row][move.col]
                            });
                        });
                    } catch (error) {
                        console.error('💥 Erro ao calcular movimentos para peça em', row, col, ':', error);
                    }
                }
            }
        }
        
        console.log('📝 Total de movimentos encontrados:', moves.length);
        return moves;
    }

    getRandomMove(moves) {
        console.log('🎲 getRandomMove com', moves.length, 'movimentos');
        if (!moves || moves.length === 0) {
            console.log('❌ Nenhum movimento para escolher');
            return null;
        }
        const move = moves[Math.floor(Math.random() * moves.length)];
        console.log('✅ Movimento aleatório escolhido:', move);
        return move;
    }

    getMediumMove(moves) {
        // Priorizar capturas e movimentos estratégicos
        const captureMoves = moves.filter(move => move.capturedPiece);
        const centerMoves = moves.filter(move => this.isCenterSquare(move.toRow, move.toCol));
        const developmentMoves = moves.filter(move => this.isDevelopmentMove(move));
        const safeMoves = moves.filter(move => !this.isMoveDangerous(move));
        
        // 1. Primeiro: capturas valiosas e seguras
        const safeCaptures = captureMoves.filter(move => !this.isMoveDangerous(move));
        if (safeCaptures.length > 0) {
            return this.getBestCapture(safeCaptures);
        }
        
        // 2. Segundo: capturas mesmo que arriscadas (se valer a pena)
        if (captureMoves.length > 0) {
            const valuableCaptures = captureMoves.filter(move => 
                this.getPieceValue(move.capturedPiece.type) >= this.getPieceValue(move.piece.type)
            );
            if (valuableCaptures.length > 0) {
                return this.getBestCapture(valuableCaptures);
            }
        }
        
        // 3. Terceiro: movimentos de desenvolvimento
        const safeDevelopment = developmentMoves.filter(move => !this.isMoveDangerous(move));
        if (safeDevelopment.length > 0) {
            return this.getRandomMove(safeDevelopment);
        }
        
        // 4. Quarto: movimentos para o centro
        const safeCenterMoves = centerMoves.filter(move => !this.isMoveDangerous(move));
        if (safeCenterMoves.length > 0) {
            return this.getRandomMove(safeCenterMoves);
        }
        
        // 5. Quinto: movimentos seguros
        if (safeMoves.length > 0) {
            return this.getRandomMove(safeMoves);
        }
        
        // 6. Por último: qualquer movimento (evitar repetição)
        return this.avoidRepetitiveMove(moves);
    }

    getHardMove(moves) {
        // Implementação melhorada do algoritmo minimax
        let bestMove = null;
        let bestScore = -Infinity;
        
        // Priorizar capturas imediatamente
        const captureMoves = moves.filter(move => move.capturedPiece);
        if (captureMoves.length > 0) {
            const bestCapture = this.getBestCapture(captureMoves);
            if (this.getPieceValue(bestCapture.capturedPiece.type) >= 3) {
                return bestCapture; // Capturar peças valiosas imediatamente
            }
        }
        
        // Usar minimax apenas para os melhores candidatos (otimização)
        const candidateMoves = this.getBestCandidates(moves, 8);
        
        for (const move of candidateMoves) {
            const score = this.minimax(move, 3, false, -Infinity, Infinity);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove || this.getMediumMove(moves);
    }

    getBestCandidates(moves, maxCandidates) {
        // Selecionar os melhores candidatos para análise profunda
        const scoredMoves = moves.map(move => ({
            move,
            score: this.quickEvaluateMove(move)
        }));
        
        scoredMoves.sort((a, b) => b.score - a.score);
        return scoredMoves.slice(0, maxCandidates).map(item => item.move);
    }

    quickEvaluateMove(move) {
        // Avaliação rápida para pré-seleção
        let score = 0;
        
        if (move.capturedPiece) {
            score += this.getPieceValue(move.capturedPiece.type) * 10;
        }
        
        // Movimento para o centro
        const centerDistance = Math.abs(move.toRow - 3.5) + Math.abs(move.toCol - 3.5);
        score += (7 - centerDistance) * 2;
        
        // Desenvolvimento
        if (move.piece.type !== 'pawn' && move.fromRow === (move.piece.color === 'white' ? 7 : 0)) {
            score += 20;
        }
        
        return score;
    }

    getExtremeMove(moves) {
        // Modo EXTREMO: IA brutalmente inteligente
        console.log('🔥 IA EXTREMA ativada! Prepare-se...');
        
        // 1. Verificar se pode dar xeque-mate em 1 movimento
        const checkmateMove = this.findCheckmateInOne(moves);
        if (checkmateMove) {
            console.log('💀 XEQUE-MATE encontrado!');
            return checkmateMove;
        }
        
        // 2. Verificar se pode dar xeque
        const checkMoves = this.findCheckMoves(moves);
        if (checkMoves.length > 0) {
            console.log('⚡ Movimento de xeque encontrado!');
            return this.getBestCapture(checkMoves.length > 1 ? checkMoves : [checkMoves[0]]);
        }
        
        // 3. Capturar peças valiosas imediatamente
        const valuableCaptures = moves.filter(move => 
            move.capturedPiece && this.getPieceValue(move.capturedPiece.type) >= 5
        );
        if (valuableCaptures.length > 0) {
            console.log('💎 Captura valiosa encontrada!');
            return this.getBestCapture(valuableCaptures);
        }
        
        // 4. Usar minimax com profundidade 4 (muito mais profundo)
        let bestMove = null;
        let bestScore = -Infinity;
        
        // Analisar apenas os melhores candidatos para otimização
        const topCandidates = this.getBestCandidates(moves, 6);
        
        for (const move of topCandidates) {
            const score = this.minimaxExtreme(move, 4, false, -Infinity, Infinity);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        console.log(`🧠 Melhor movimento encontrado com score: ${bestScore}`);
        return bestMove || this.getHardMove(moves);
    }

    findCheckmateInOne(moves) {
        // Verificar se algum movimento resulta em xeque-mate
        for (const move of moves) {
            // Simular o movimento
            const originalPiece = this.board[move.toRow][move.toCol];
            this.board[move.toRow][move.toCol] = move.piece;
            this.board[move.fromRow][move.fromCol] = null;
            
            // Atualizar posição do rei se necessário
            let tempKingPos = null;
            if (move.piece.type === 'king') {
                tempKingPos = this.kings[move.piece.color];
                this.kings[move.piece.color] = {row: move.toRow, col: move.toCol};
            }
            
            const opponentColor = this.aiColor === 'white' ? 'black' : 'white';
            const isCheckmate = this.isInCheck(opponentColor) && !this.hasLegalMoves(opponentColor);
            
            // Restaurar o tabuleiro
            this.board[move.fromRow][move.fromCol] = move.piece;
            this.board[move.toRow][move.toCol] = originalPiece;
            if (tempKingPos) {
                this.kings[move.piece.color] = tempKingPos;
            }
            
            if (isCheckmate) {
                return move;
            }
        }
        return null;
    }

    findCheckMoves(moves) {
        // Encontrar movimentos que dão xeque
        const checkMoves = [];
        
        for (const move of moves) {
            // Simular o movimento
            const originalPiece = this.board[move.toRow][move.toCol];
            this.board[move.toRow][move.toCol] = move.piece;
            this.board[move.fromRow][move.fromCol] = null;
            
            // Atualizar posição do rei se necessário
            let tempKingPos = null;
            if (move.piece.type === 'king') {
                tempKingPos = this.kings[move.piece.color];
                this.kings[move.piece.color] = {row: move.toRow, col: move.toCol};
            }
            
            const opponentColor = this.aiColor === 'white' ? 'black' : 'white';
            const givesCheck = this.isInCheck(opponentColor);
            
            // Restaurar o tabuleiro
            this.board[move.fromRow][move.fromCol] = move.piece;
            this.board[move.toRow][move.toCol] = originalPiece;
            if (tempKingPos) {
                this.kings[move.piece.color] = tempKingPos;
            }
            
            if (givesCheck) {
                checkMoves.push(move);
            }
        }
        
        return checkMoves;
    }

    getGodModeMove(moves) {
        console.log('👑 GOD MODE ATIVADO - Preparando análise suprema...');
        
        // 1. Procurar xeque-mate em até 3 movimentos
        const mateMove = this.findMateInMoves(moves, 3);
        if (mateMove) {
            console.log('💀 XEQUE-MATE INEVITÁVEL encontrado!');
            return mateMove;
        }
        
        // 2. Evitar xeque-mate adversário
        const defensiveMove = this.avoidOpponentMate(moves);
        if (defensiveMove) {
            console.log('🛡️ Movimento defensivo crucial!');
            return defensiveMove;
        }
        
        // 3. Procurar sequências táticas devastadoras
        const tacticalMove = this.findTacticalSequence(moves);
        if (tacticalMove) {
            console.log('⚡ Sequência tática devastadora!');
            return tacticalMove;
        }
        
        // 4. Análise ultra-profunda com minimax estendido
        let bestMove = null;
        let bestScore = -Infinity;
        
        // Usar apenas os melhores candidatos para otimização
        const eliteCandidates = this.getEliteCandidates(moves, 8);
        
        for (const move of eliteCandidates) {
            // Minimax com profundidade 6 + extensões
            const score = this.minimaxGodMode(move, 6, false, -Infinity, Infinity, 0);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        console.log(`🧠 GOD MODE - Melhor movimento: score ${bestScore}`);
        return bestMove || this.getExtremeMove(moves);
    }

    findMateInMoves(moves, maxDepth) {
        // Procurar xeque-mate em N movimentos
        for (let depth = 1; depth <= maxDepth; depth++) {
            for (const move of moves) {
                if (this.leadsToMateInN(move, depth)) {
                    return move;
                }
            }
        }
        return null;
    }

    leadsToMateInN(move, n) {
        // Verificar se um movimento leva ao mate em N jogadas
        if (n <= 0) return false;
        
        // Simular movimento
        const originalPiece = this.board[move.toRow][move.toCol];
        this.board[move.toRow][move.toCol] = move.piece;
        this.board[move.fromRow][move.fromCol] = null;
        
        let tempKingPos = null;
        if (move.piece.type === 'king') {
            tempKingPos = this.kings[move.piece.color];
            this.kings[move.piece.color] = {row: move.toRow, col: move.toCol};
        }
        
        const opponentColor = this.aiColor === 'white' ? 'black' : 'white';
        const opponentMoves = this.getAllPossibleMoves(opponentColor);
        
        let isMate = false;
        
        if (n === 1) {
            // Verificar se é xeque-mate imediato
            isMate = this.isCheckmate(opponentColor);
        } else {
            // Verificar se todos os movimentos do oponente levam ao mate
            isMate = opponentMoves.length === 0 || 
                    opponentMoves.every(oppMove => {
                        // Simular movimento do oponente
                        const origPiece2 = this.board[oppMove.toRow][oppMove.toCol];
                        this.board[oppMove.toRow][oppMove.toCol] = oppMove.piece;
                        this.board[oppMove.fromRow][oppMove.fromCol] = null;
                        
                        let tempKingPos2 = null;
                        if (oppMove.piece.type === 'king') {
                            tempKingPos2 = this.kings[oppMove.piece.color];
                            this.kings[oppMove.piece.color] = {row: oppMove.toRow, col: oppMove.toCol};
                        }
                        
                        const myNextMoves = this.getAllPossibleMoves(this.aiColor);
                        const leadToMate = myNextMoves.some(nextMove => 
                            this.leadsToMateInN(nextMove, n - 1)
                        );
                        
                        // Restaurar movimento do oponente
                        this.board[oppMove.fromRow][oppMove.fromCol] = oppMove.piece;
                        this.board[oppMove.toRow][oppMove.toCol] = origPiece2;
                        if (tempKingPos2) {
                            this.kings[oppMove.piece.color] = tempKingPos2;
                        }
                        
                        return leadToMate;
                    });
        }
        
        // Restaurar movimento original
        this.board[move.fromRow][move.fromCol] = move.piece;
        this.board[move.toRow][move.toCol] = originalPiece;
        if (tempKingPos) {
            this.kings[move.piece.color] = tempKingPos;
        }
        
        return isMate;
    }

    avoidOpponentMate(moves) {
        // Verificar se o oponente pode dar mate no próximo movimento
        const opponentColor = this.aiColor === 'white' ? 'black' : 'white';
        const opponentMoves = this.getAllPossibleMoves(opponentColor);
        
        for (const oppMove of opponentMoves) {
            if (this.leadsToMateInN(oppMove, 1)) {
                // Oponente pode dar mate! Encontrar defesa
                for (const move of moves) {
                    // Simular nosso movimento
                    const originalPiece = this.board[move.toRow][move.toCol];
                    this.board[move.toRow][move.toCol] = move.piece;
                    this.board[move.fromRow][move.fromCol] = null;
                    
                    let tempKingPos = null;
                    if (move.piece.type === 'king') {
                        tempKingPos = this.kings[move.piece.color];
                        this.kings[move.piece.color] = {row: move.toRow, col: move.toCol};
                    }
                    
                    // Verificar se ainda pode dar mate
                    const newOppMoves = this.getAllPossibleMoves(opponentColor);
                    const stillMate = newOppMoves.some(newOppMove => 
                        this.leadsToMateInN(newOppMove, 1)
                    );
                    
                    // Restaurar
                    this.board[move.fromRow][move.fromCol] = move.piece;
                    this.board[move.toRow][move.toCol] = originalPiece;
                    if (tempKingPos) {
                        this.kings[move.piece.color] = tempKingPos;
                    }
                    
                    if (!stillMate) {
                        return move; // Este movimento previne o mate
                    }
                }
                break;
            }
        }
        
        return null;
    }

    findTacticalSequence(moves) {
        // Procurar sequências táticas como garfos, espetos, descobertas
        const tacticalMoves = [];
        
        for (const move of moves) {
            let tacticalScore = 0;
            
            // Simular movimento
            const originalPiece = this.board[move.toRow][move.toCol];
            this.board[move.toRow][move.toCol] = move.piece;
            this.board[move.fromRow][move.fromCol] = null;
            
            // Verificar garfos (atacar múltiplas peças)
            const attackedSquares = this.getAttackedSquares(move.toRow, move.toCol, move.piece);
            const attackedPieces = attackedSquares.filter(([r, c]) => {
                const piece = this.board[r][c];
                return piece && piece.color !== this.aiColor;
            });
            
            if (attackedPieces.length >= 2) {
                tacticalScore += attackedPieces.length * 50;
                const totalValue = attackedPieces.reduce((sum, [r, c]) => 
                    sum + this.getPieceValue(this.board[r][c].type), 0
                );
                tacticalScore += totalValue * 10;
            }
            
            // Verificar descobertas (movimento que revela ataque)
            tacticalScore += this.evaluateDiscoveredAttacks(move) * 30;
            
            // Verificar espetos (alinhar peças valiosas)
            tacticalScore += this.evaluateSkewer(move) * 40;
            
            // Restaurar
            this.board[move.fromRow][move.fromCol] = move.piece;
            this.board[move.toRow][move.toCol] = originalPiece;
            
            if (tacticalScore > 0) {
                tacticalMoves.push({move, score: tacticalScore});
            }
        }
        
        if (tacticalMoves.length > 0) {
            tacticalMoves.sort((a, b) => b.score - a.score);
            return tacticalMoves[0].move;
        }
        
        return null;
    }

    minimaxGodMode(move, depth, isMaximizing, alpha, beta, extensions) {
        // Minimax ultra-avançado com extensões
        const maxExtensions = 8;
        
        if (depth === 0 && extensions < maxExtensions) {
            // Extensões: continuar busca em posições críticas
            if (this.isCheckPosition(move) || 
                (move.capturedPiece && this.getPieceValue(move.capturedPiece.type) >= 5)) {
                return this.minimaxGodMode(move, 1, isMaximizing, alpha, beta, extensions + 1);
            }
        }
        
        if (depth === 0) {
            return this.evaluateMoveGodMode(move);
        }
        
        // Simular movimento
        const originalPiece = this.board[move.toRow][move.toCol];
        this.board[move.toRow][move.toCol] = move.piece;
        this.board[move.fromRow][move.fromCol] = null;
        
        let tempKingPos = null;
        if (move.piece.type === 'king') {
            tempKingPos = this.kings[move.piece.color];
            this.kings[move.piece.color] = {row: move.toRow, col: move.toCol};
        }
        
        const color = isMaximizing ? this.aiColor : (this.aiColor === 'white' ? 'black' : 'white');
        const possibleMoves = this.getAllPossibleMoves(color);
        
        let bestScore = isMaximizing ? -Infinity : Infinity;
        
        // Ordenação inteligente para melhor poda
        const sortedMoves = this.sortMovesForGodMode(possibleMoves);
        
        for (const nextMove of sortedMoves) {
            const score = this.minimaxGodMode(nextMove, depth - 1, !isMaximizing, alpha, beta, extensions);
            
            if (isMaximizing) {
                bestScore = Math.max(bestScore, score);
                alpha = Math.max(alpha, score);
            } else {
                bestScore = Math.min(bestScore, score);
                beta = Math.min(beta, score);
            }
            
            if (beta <= alpha) {
                break; // Poda alfa-beta
            }
        }
        
        // Restaurar tabuleiro
        this.board[move.fromRow][move.fromCol] = move.piece;
        this.board[move.toRow][move.toCol] = originalPiece;
        if (tempKingPos) {
            this.kings[move.piece.color] = tempKingPos;
        }
        
        return bestScore;
    }

    evaluateMoveGodMode(move) {
        // Avaliação suprema para God Mode
        let score = 0;
        
        // Captura com peso massivo
        if (move.capturedPiece) {
            score += this.getPieceValue(move.capturedPiece.type) * 30;
        }
        
        // Controle territorial supremo
        score += this.evaluateSupremeTerritorialControl(move) * 12;
        
        // Coordenação perfeita
        score += this.evaluateSupremeCoordination(move) * 10;
        
        // Segurança do rei absoluta
        score += this.evaluateSupremeKingSafety(move) * 15;
        
        // Pressão posicional
        score += this.evaluatePositionalPressure(move) * 8;
        
        // Iniciativa e tempo
        score += this.evaluateInitiative(move) * 6;
        
        // Penalidade brutal por movimentos ruins
        if (this.isMoveDangerous(move)) {
            score -= this.getPieceValue(move.piece.type) * 25;
        }
        
        return score;
    }

    getEliteCandidates(moves, count) {
        // Selecionar apenas os melhores candidatos
        const scored = moves.map(move => ({
            move,
            score: this.quickEvaluateMove(move)
        }));
        
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, count).map(item => item.move);
    }

    sortMovesForGodMode(moves) {
        // Ordenação suprema para God Mode
        return moves.sort((a, b) => {
            let scoreA = 0, scoreB = 0;
            
            // Prioridade máxima para capturas
            if (a.capturedPiece) scoreA += this.getPieceValue(a.capturedPiece.type) * 100;
            if (b.capturedPiece) scoreB += this.getPieceValue(b.capturedPiece.type) * 100;
            
            // Xeques
            if (this.wouldGiveCheck(a)) scoreA += 80;
            if (this.wouldGiveCheck(b)) scoreB += 80;
            
            // Desenvolvimento
            if (a.piece.type !== 'pawn' && a.fromRow === (a.piece.color === 'white' ? 7 : 0)) scoreA += 60;
            if (b.piece.type !== 'pawn' && b.fromRow === (b.piece.color === 'white' ? 7 : 0)) scoreB += 60;
            
            return scoreB - scoreA;
        });
    }

    evaluateDiscoveredAttacks(move) {
        // Avaliar ataques descobertos
        let discovered = 0;
        
        // Verificar se o movimento da peça revela um ataque de outra peça
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [dr, dc] of directions) {
            let r = move.fromRow + dr;
            let c = move.fromCol + dc;
            
            // Procurar peça nossa na direção oposta
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const piece = this.board[r][c];
                if (piece && piece.color === this.aiColor) {
                    // Verificar se esta peça pode atacar através da posição original
                    if (this.canPieceAttackThroughSquare(piece, r, c, move.fromRow, move.fromCol)) {
                        discovered += 25;
                    }
                    break;
                } else if (piece) {
                    break;
                }
                r += dr;
                c += dc;
            }
        }
        
        return discovered;
    }

    evaluateSkewer(move) {
        // Avaliar espetos (alinhamento de peças valiosas)
        let skewer = 0;
        
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [dr, dc] of directions) {
            const pieces = [];
            let r = move.toRow + dr;
            let c = move.toCol + dc;
            
            // Coletar peças na direção
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const piece = this.board[r][c];
                if (piece && piece.color !== this.aiColor) {
                    pieces.push(piece);
                    if (pieces.length >= 2) break;
                }
                r += dr;
                c += dc;
            }
            
            // Se temos 2 peças inimigas alinhadas, é um espeto
            if (pieces.length >= 2) {
                const value1 = this.getPieceValue(pieces[0].type);
                const value2 = this.getPieceValue(pieces[1].type);
                skewer += Math.min(value1, value2) * 15;
            }
        }
        
        return skewer;
    }

    canPieceAttackThroughSquare(piece, pieceRow, pieceCol, throughRow, throughCol) {
        // Verificar se uma peça pode atacar através de uma casa específica
        if (piece.type === 'rook' || piece.type === 'queen') {
            // Movimento linear
            if (pieceRow === throughRow || pieceCol === throughCol) {
                return true;
            }
        }
        
        if (piece.type === 'bishop' || piece.type === 'queen') {
            // Movimento diagonal
            const rowDiff = Math.abs(pieceRow - throughRow);
            const colDiff = Math.abs(pieceCol - throughCol);
            if (rowDiff === colDiff) {
                return true;
            }
        }
        
        return false;
    }

    isCheckPosition(move) {
        // Verificar se a posição resulta em xeque
        return this.wouldGiveCheck(move);
    }

    wouldGiveCheck(move) {
        // Verificar se um movimento daria xeque
        const opponentColor = this.aiColor === 'white' ? 'black' : 'white';
        const opponentKing = this.kings[opponentColor];
        
        // Simular movimento
        const originalPiece = this.board[move.toRow][move.toCol];
        this.board[move.toRow][move.toCol] = move.piece;
        this.board[move.fromRow][move.fromCol] = null;
        
        const givesCheck = this.isSquareUnderAttack(opponentKing.row, opponentKing.col, this.aiColor);
        
        // Restaurar
        this.board[move.fromRow][move.fromCol] = move.piece;
        this.board[move.toRow][move.toCol] = originalPiece;
        
        return givesCheck;
    }

    countThreats(move) {
        // Contar quantas peças inimigas estão sendo ameaçadas
        let threats = 0;
        
        // Simular movimento
        const originalPiece = this.board[move.toRow][move.toCol];
        this.board[move.toRow][move.toCol] = move.piece;
        this.board[move.fromRow][move.fromCol] = null;
        
        const attackedSquares = this.getAttackedSquares(move.toRow, move.toCol, move.piece);
        
        for (const [r, c] of attackedSquares) {
            const piece = this.board[r][c];
            if (piece && piece.color !== this.aiColor) {
                threats++;
            }
        }
        
        // Restaurar
        this.board[move.fromRow][move.fromCol] = move.piece;
        this.board[move.toRow][move.toCol] = originalPiece;
        
        return threats;
    }

    getAttackedSquares(row, col, piece) {
        // Retornar todas as casas atacadas por uma peça
        const attacked = [];
        
        switch (piece.type) {
            case 'pawn':
                const direction = piece.color === 'white' ? -1 : 1;
                const attackRows = [row + direction];
                const attackCols = [col - 1, col + 1];
                
                for (const attackRow of attackRows) {
                    for (const attackCol of attackCols) {
                        if (attackRow >= 0 && attackRow < 8 && attackCol >= 0 && attackCol < 8) {
                            attacked.push([attackRow, attackCol]);
                        }
                    }
                }
                break;
                
            case 'rook':
                // Linhas e colunas
                for (let i = 0; i < 8; i++) {
                    if (i !== row) attacked.push([i, col]);
                    if (i !== col) attacked.push([row, i]);
                }
                break;
                
            case 'bishop':
                // Diagonais
                for (let i = 1; i < 8; i++) {
                    const positions = [
                        [row + i, col + i], [row + i, col - i],
                        [row - i, col + i], [row - i, col - i]
                    ];
                    for (const [r, c] of positions) {
                        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                            attacked.push([r, c]);
                        }
                    }
                }
                break;
                
            case 'queen':
                // Combinação de torre e bispo
                for (let i = 0; i < 8; i++) {
                    if (i !== row) attacked.push([i, col]);
                    if (i !== col) attacked.push([row, i]);
                }
                for (let i = 1; i < 8; i++) {
                    const positions = [
                        [row + i, col + i], [row + i, col - i],
                        [row - i, col + i], [row - i, col - i]
                    ];
                    for (const [r, c] of positions) {
                        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                            attacked.push([r, c]);
                        }
                    }
                }
                break;
                
            case 'king':
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const newRow = row + dr;
                        const newCol = col + dc;
                        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                            attacked.push([newRow, newCol]);
                        }
                    }
                }
                break;
                
            case 'knight':
                const knightMoves = [
                    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                    [1, -2], [1, 2], [2, -1], [2, 1]
                ];
                for (const [dr, dc] of knightMoves) {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                        attacked.push([newRow, newCol]);
                    }
                }
                break;
        }
        
        return attacked;
    }

    // ...existing code...
}

// Inicializar jogo quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new Chess();
});
