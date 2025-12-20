/**
 * PlayState - Estado principal do jogo Match-3 aprimorado
 * Melhorias: centralização, pontuação com combo/high score, UI bonita, input inteligente,
 * debug opcional, código organizado.
 */
var PlayState = new Kiwi.State('PlayState');

/**
 * Inicialização do jogo.
 */
PlayState.create = function () {

    // ==================== CONFIGURAÇÕES FÁCEIS DE AJUSTAR ====================
    this.config = {
        gemCount: 8,                        // Tipos de gems (não mude muito!)
        tileSize: { x: 120, y: 120 },       // Tamanho das gems
        boardSize: { x: 14, y: 20 },        // Tamanho do board (cols x rows)
        basePointsPerGem: 25,               // Pontos base por gem destruída
        comboResetDelay: 4000,              // ms sem match para resetar combo
        debugMode: false                    // true para ativar tecla C (mude aqui!)
    };

    // Calcula offset para CENTRALIZAR o board perfeitamente
    var boardPixelW = this.config.boardSize.x * this.config.tileSize.x;
    var boardPixelH = this.config.boardSize.y * this.config.tileSize.y;
    var offset = {
        x: Math.max(0, (this.game.stage.width - boardPixelW) / 2),
        y: Math.max(60, (this.game.stage.height - boardPixelH) / 2)  // Espaço para UI no topo
    };

    // ==================== SISTEMA DE PONTUAÇÃO ====================
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('match3_highscore') || '0', 10);
    this.combo = 1;
    this.lastMatchTime = 0;
    this.level = 1;  // Aumenta a cada 5000 pontos

    // ==================== INICIALIZAÇÃO CORE (igual ao original) ====================
    var spritesheet = this.textures.gems;
    this.coordMapper = new CoordMapper(this.config.tileSize, offset);
    var animEvents = new AnimEvents();
    var board = new Board(this.config.boardSize);
    var tileFactory = MatchThreeTile.createFactory(
        this, spritesheet, this.config.gemCount, this.coordMapper, animEvents
    );
    this.logic = new MatchThreeLogic(board, animEvents, tileFactory);

    // ==================== UI DE PONTUAÇÃO BONITA ====================
    this.createScoreUI();

    // ==================== INPUT MELHORADO ====================
    this.enableSwipe = true;
    this.selectedCoord = null;  // Para swipe inteligente

    // Callbacks originais (mantidos!)
    this.game.input.onUp.add(this.clickTileDown, this);
    if (this.enableSwipe) {
        this.game.input.onDown.add(this.clickTileUp, this);
    }

    // Debug key REAL (melhor que o hack {isDown:false})
    if (this.config.debugMode) {
        this.debugChangeKey = this.game.input.keyboard.addKey(Kiwi.Input.Keycodes.C);
    } else {
        this.debugChangeKey = { isDown: false };
    }

    // ==================== HOOKS PARA PONTUAÇÃO ====================
    // Teste esses eventos UM POR UM se o score não subir (comente os outros):
    animEvents.on('tilesPopped', this.onTilesPopped, this);     // Mais comum
    // animEvents.on('tilesRemoved', this.onTilesPopped, this);
    // animEvents.on('matchFound', this.onTilesPopped, this);
    // animEvents.on('tilesDestroyed', this.onTilesPopped, this);

    // Inicializa o board (adicione se não existir no original!)
    // this.logic.initBoard();  // Descomente se necessário
};

/**
 * Cria UI de pontuação no topo (Score, High, Level, Combo animado).
 */
PlayState.createScoreUI = function () {
    var uiY = 15;
    var fontSize = 32;
    var strokeThick = 5;

    // Score atual (branco)
    this.scoreText = new Kiwi.GameObjects.Text(
        this, 'Score: 0', 25, uiY, 'Arial', fontSize, '#ffffff'
    );
    this.scoreText.stroke = '#000000';
    this.scoreText.strokeThickness = strokeThick;
    this.scoreText.textAlign = 'left';
    this.addChild(this.scoreText);

    // High Score (dourado, à direita)
    this.highScoreText = new Kiwi.GameObjects.Text(
        this, 'High: 0', this.game.stage.width - 220, uiY, 'Arial', fontSize, '#ffd700'
    );
    this.highScoreText.stroke = '#000000';
    this.highScoreText.strokeThickness = strokeThick;
    this.highScoreText.textAlign = 'right';
    this.addChild(this.highScoreText);

    // Level (verde, centro)
    this.levelText = new Kiwi.GameObjects.Text(
        this, 'Level: 1', this.game.stage.width / 2 - 70, uiY, 'Arial', fontSize, '#00ff88'
    );
    this.levelText.stroke = '#000000';
    this.levelText.strokeThickness = strokeThick;
    this.addChild(this.levelText);

    // Combo (laranja piscante, abaixo)
    this.comboText = new Kiwi.GameObjects.Text(
        this, 'COMBO x1!', this.game.stage.width / 2, uiY + 45, 'Arial', 48, '#ffaa00'
    );
    this.comboText.textAlign = 'center';
    this.comboText.stroke = '#cc0000';
    this.comboText.strokeThickness = strokeThick;
    this.comboText.alpha = 0;  // Escondido
    this.addChild(this.comboText);

    this.updateScoreUI();
};

/**
 * Adiciona pontos e atualiza combo/level.
 */
PlayState.addScore = function (gemsDestroyed) {
    if (gemsDestroyed <= 0) return;

    var points = gemsDestroyed * this.config.basePointsPerGem * this.combo;
    this.score += points;

    // High score
    if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('match3_highscore', this.highScore.toString());
    }

    // Level up (a cada 5000 pontos)
    this.level = Math.floor(this.score / 5000) + 1;

    this.lastMatchTime = this.game.time.now;
    this.combo = Math.min(this.combo + 1, 15);  // Max combo x15

    this.updateScoreUI();
    this.showComboEffect();
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
 * Anima combo na tela (piscada + fade).
 */
PlayState.showComboEffect = function () {
    if (this.combo <= 1) return;

    this.comboText.text = 'COMBO x' + this.combo + '!';
    this.comboText.alpha = 1;
    this.comboText.scaleX = this.comboText.scaleY = 1.2;

    // Tween: escala + fade out
    var tween = this.game.tweens.create(this.comboText);
    tween.to({ alpha: 0, scaleX: 1, scaleY: 1 }, 1200, Kiwi.Anims.Tween.Easing.Back.Out);
    tween.start();
};

/**
 * Callback do evento de gems destruídas (chamado automaticamente!).
 */
PlayState.onTilesPopped = function (tiles) {
    if (!tiles || tiles.length === 0) return;
    this.addScore(tiles.length);
};

/**
 * Input DOWN (seleção inicial - igual original + swipe).
 */
PlayState.clickTileDown = function (mouseX, mouseY) {
    var coord = this.coordMapper.screenToBoard({x: mouseX, y: mouseY});

    // Debug mode
    if (this.config.debugMode && this.debugChangeKey.isDown) {
        this.logic.debugChangeKey(coord);
        return;
    }

    // Seleção normal
    this.logic.invertTileSelectionState(coord);
    this.selectedCoord = coord;
};

/**
 * Input UP (swap se adjacente - MELHORIA!).
 */
PlayState.clickTileUp = function (mouseX, mouseY) {
    if (!this.selectedCoord) return;

    var coord = this.coordMapper.screenToBoard({x: mouseX, y: mouseY});

    // Só faz swap se as tiles forem ADJACENTES (horizontal/vertical)
    if (this.areAdjacent(this.selectedCoord, coord)) {
        // Tenta swap (a logic cuida do resto: match, fall, etc.)
        this.logic.swapTiles(this.selectedCoord, coord);  // Assuma que existe ou use invert duas vezes
    }

    // Desseleciona
    this.logic.invertTileSelectionState(this.selectedCoord);
    this.selectedCoord = null;
};

/**
 * Verifica se coords são adjacentes (up/down/left/right).
 */
PlayState.areAdjacent = function (c1, c2) {
    var dx = Math.abs(c1.x - c2.x);
    var dy = Math.abs(c1.y - c2.y);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
};

/**
 * Update: gerencia reset de combo.
 */
PlayState.update = function () {
    Kiwi.State.prototype.update.call(this);

    // Reset combo se inativo
    if (this.combo > 1 && (this.game.time.now - this.lastMatchTime > this.config.comboResetDelay)) {
        this.combo = 1;
    }

    // Use this.level para dificuldade futura:
    // ex: this.config.gemCount = 6 + (this.level - 1) % 3;
};