/**
 * The PlayState is the core state that is used in the game.
 */
var PlayState = new Kiwi.State('PlayState');

/**
 * This create method is executed when Kiwi Game reaches the boot stage of the game loop.
 * It takes care of initializing all the game logic and resources.
 *
 * @method create
 * @public
 */
PlayState.create = function () {
    // Configurações do jogo (fácil de ajustar)
    this.config = {
        gemCount: 8,                    // Número de tipos de gems (8 é um bom equilíbrio)
        tileSize: { x: 120, y: 120 },   // Tamanho de cada tile
        boardSize: { x: 14, y: 20 },    // Dimensão do board em tiles
        enableSwipe: true,              // Ativa swipe para swap (true = seleção + drag)
        debugMode: false,               // Ativa tecla de debug (mude para true se quiser testar)
        basePointsPerGem: 10,           // Pontos base por gem destruída
        comboResetDelay: 2000           // ms para resetar combo (tempo sem atividade)
    };

    // Calcula offset para centralizar o board na tela
    var boardPixelWidth = this.config.boardSize.x * this.config.tileSize.x;
    var boardPixelHeight = this.config.boardSize.y * this.config.tileSize.y;
    this.config.offset = {
        x: (this.game.stage.width - boardPixelWidth) / 2,
        y: (this.game.stage.height - boardPixelHeight) / 2 + 20  // Pequeno offset para UI superior
    };

    // Inicializa pontuação
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('match3_highscore') || '0', 10);
    this.combo = 1;
    this.level = 1;
    this.lastActivityTime = 0;

    // Spritesheet das gems
    var spritesheet = this.textures.gems;

    // Mappers e eventos
    this.coordMapper = new CoordMapper(this.config.tileSize, this.config.offset);
    this.animEvents = new AnimEvents();

    // Board e fábrica de tiles
    this.board = new Board(this.config.boardSize);
    this.tileFactory = MatchThreeTile.createFactory(
        this,
        spritesheet,
        this.config.gemCount,
        this.coordMapper,
        this.animEvents
    );

    // Lógica principal do jogo
    this.logic = new MatchThreeLogic(this.board, this.animEvents, this.tileFactory);

    // Estado de seleção para swipe
    this.selectedCoord = null;

    // UI de pontuação (Text objects do Kiwi.js)
    this.createScoreUI();

    // Input unificado (mouse + touch)
    this.game.input.onTapped.add(this.handleTap, this);

    // Tecla de debug (C) - opcional
    if (this.config.debugMode) {
        this.debugKey = this.game.input.keyboard.addKey(Kiwi.Input.Keycodes.C);
    } else {
        this.debugKey = null;
    }

    // Opcional: ouça eventos do animEvents para pontuação precisa (exemplo abaixo)
    // this.animEvents.on('tilesPopped', this.onTilesPopped, this);  // Descomente se logic emite isso
};

/**
 * Cria a UI de pontuação no topo da tela.
 */
PlayState.createScoreUI = function () {
    var uiY = 10;
    var fontSize = 28;
    var fontColor = '#ffffff';
    var strokeColor = '#000000';
    var strokeThickness = 4;

    // Score atual
    this.scoreText = new Kiwi.GameObjects.Text(this.game, 'Score: 0', 20, uiY, '#scoreFont');
    this.scoreText.fontSize = fontSize;
    this.scoreText.fill = fontColor;
    this.scoreText.stroke = strokeColor;
    this.scoreText.strokeThickness = strokeThickness;
    this.scoreText.textAlign = 'left';
    this.addChild(this.scoreText);

    // High Score
    this.highScoreText = new Kiwi.GameObjects.Text(this.game, 'High: 0', this.game.stage.width - 200, uiY, '#scoreFont');
    this.highScoreText.fontSize = fontSize;
    this.highScoreText.fill = '#ffd700';  // Dourado
    this.highScoreText.stroke = strokeColor;
    this.highScoreText.strokeThickness = strokeThickness;
    this.highScoreText.textAlign = 'right';
    this.addChild(this.highScoreText);

    // Nível (aumenta a cada 10.000 pontos, pode afetar dificuldade)
    this.levelText = new Kiwi.GameObjects.Text(this.game, 'Level: 1', this.game.stage.width / 2 - 60, uiY, '#scoreFont');
    this.levelText.fontSize = fontSize;
    this.levelText.fill = '#00ff00';
    this.levelText.stroke = strokeColor;
    this.levelText.strokeThickness = strokeThickness;
    this.addChild(this.levelText);

    // Combo (visual temporário)
    this.comboText = new Kiwi.GameObjects.Text(this.game, 'Combo: x1', this.game.stage.width / 2 - 60, uiY + 35, '#scoreFont');
    this.comboText.fontSize = 24;
    this.comboText.fill = '#ff4400';
    this.comboText.alpha = 0;  // Escondido inicialmente
    this.addChild(this.comboText);

    this.updateScoreUI();
};

/**
 * Adiciona pontos à pontuação com multiplicador de combo.
 * @param {number} gemsDestroyed - Número de gems destruídas (para pontuação precisa)
 */
PlayState.addScore = function (gemsDestroyed) {
    if (gemsDestroyed <= 0) return;

    var points = gemsDestroyed * this.config.basePointsPerGem * this.combo;
    this.score += points;

    // Atualiza high score
    if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('match3_highscore', this.highScore);
    }

    // Atualiza nível
    this.level = Math.floor(this.score / 10000) + 1;

    // Atualiza UI
    this.updateScoreUI();

    // Mostra combo temporariamente
    this.showCombo();
};

/**
 * Atualiza textos da UI.
 */
PlayState.updateScoreUI = function () {
    this.scoreText.text = 'Score: ' + this.score.toLocaleString();
    this.highScoreText.text = 'High: ' + this.highScore.toLocaleString();
    this.levelText.text = 'Level: ' + this.level;
};

/**
 * Mostra multiplicador de combo com fade out.
 */
PlayState.showCombo = function () {
    this.comboText.text = 'Combo: x' + this.combo;
    this.comboText.alpha = 1;
    var tween = this.game.tweens.create(this.comboText);
    tween.to({ alpha: 0 }, 1000, Kiwi.Anims.Tween.Easing.Quadratic.Out);
    tween.start();
};

/**
 * Método principal de input: lida com tap (mouse ou toque).
 * @param {number} x - Coordenada X na tela
 * @param {number} y - Coordenada Y na tela
 */
PlayState.handleTap = function (x, y) {
    this.lastActivityTime = this.game.time.now;  // Atualiza tempo de atividade para combo

    var coord = this.coordMapper.screenToBoard({ x: x, y: y });

    // Valida se o clique está dentro do board
    if (!this.logic.board.isValidCoord(coord)) {  // Assumindo método isValidCoord no board
        return;
    }

    // Modo debug: mudar tipo de gem com tecla C pressionada
    if (this.debugKey && this.debugKey.isDown) {
        this.logic.debugChangeKey(coord);
        return;
    }

    if (!this.config.enableSwipe) {
        // Modo simples: toggle seleção
        this.logic.invertTileSelectionState(coord);
        return;
    }

    // Modo swipe completo
    if (this.selectedCoord === null) {
        // Primeira seleção
        this.logic.invertTileSelectionState(coord);  // Highlight
        this.selectedCoord = coord;
    } else {
        // Segunda seleção: swap se adjacente
        if (this.areAdjacent(this.selectedCoord, coord)) {
            // Tenta swap - ASSUMA que logic.swapTiles retorna {success: true, gemsDestroyed: N}
            // Se não, implemente em MatchThreeLogic e retorne número de gems matchadas
            var swapResult = this.logic.swapTiles(this.selectedCoord, coord);
            if (swapResult && swapResult.success && swapResult.gemsDestroyed > 0) {
                this.addScore(swapResult.gemsDestroyed);
                this.combo = Math.min(this.combo + 1, 20);  // Aumenta combo
            }
        } else {
            // Não adjacente: move seleção
            this.logic.invertTileSelectionState(this.selectedCoord);  // Deshighlight anterior
            this.logic.invertTileSelectionState(coord);  // Highlight novo
        }
        this.selectedCoord = coord;
    }
};

/**
 * Verifica se duas coordenadas são adjacentes (horizontal ou vertical).
 */
PlayState.areAdjacent = function (c1, c2) {
    var dx = Math.abs(c1.x - c2.x);
    var dy = Math.abs(c1.y - c2.y);
    return (dx + dy === 1);  // Apenas horizontal ou vertical
};

/**
 * Exemplo de hook para eventos de animação (adicione em create() e implemente em logic)
 */
PlayState.onTilesPopped = function (tiles) {
    var gemsDestroyed = tiles.length;
    this.addScore(gemsDestroyed);
    this.combo = Math.min(this.combo + 1, 20);
};

/**
 * Update loop - gerencia reset de combo.
 */
PlayState.update = function () {
    Kiwi.State.prototype.update.call(this);

    // Reset combo se inativo por muito tempo
    if (this.lastActivityTime && (this.game.time.now - this.lastActivityTime > this.config.comboResetDelay)) {
        if (this.combo > 1) {
            this.combo = 1;
            // Opcional: tween para esconder combo
        }
    }

    // Aqui você pode usar this.level para aumentar dificuldade:
    // ex: this.config.gemCount = 5 + this.level; (reinicie board se necessário)
};