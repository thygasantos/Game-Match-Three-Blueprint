/**
 * PlayState - Jogo Match-3 100% funcional com pontuação, combo, high score e UI aprimorada!
 */
var PlayState = new Kiwi.State('PlayState');

PlayState.create = function () {

    // ==================== CONFIGURAÇÕES ====================
    this.config = {
        gemCount: 8,
        tileSize: { x: 120, y: 120 },
        boardSize: { x: 14, y: 20 },
        basePointsPerGem: 25,
        comboResetDelay: 4000,
        debugMode: false  // Mude para true para ativar tecla C (debug)
    };

    // ==================== PONTUAÇÃO ====================
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('match3_highscore') || '0', 10);
    this.combo = 1;
    this.lastMatchTime = 0;
    this.level = 1;

     /*
     * The offset of the board in screen coordinates.
     */
    var offset = {x: 0, y: 0};

    // ==================== CORE (original) ====================
    var gemCount = this.config.gemCount;
    var tileSize = this.config.tileSize;
    var boardSize = this.config.boardSize;
    var spritesheet = this.textures.gems;
    this.coordMapper = new CoordMapper(tileSize, offset);
    this.animEvents = new AnimEvents();  // Salva ref para hook
    var board = new Board(boardSize);
    var tileFactory = MatchThreeTile.createFactory(
        this, spritesheet, gemCount, this.coordMapper, this.animEvents
    );
    this.logic = new MatchThreeLogic(board, this.animEvents, tileFactory);

    // ==================== HOOK PERFEITO PARA PONTUAÇÃO ====================
    // Intercepta hideMatches para contar gems "popadas" EXATAMENTE!
    var self = this;
    var originalHideMatches = this.logic.hideMatches;
    this.logic.hideMatches = function(matches) {
        originalHideMatches.call(this, matches);  // Chama original
        var totalPopped = 0;
        for (var i = 0; i < matches.length; i++) {
            totalPopped += matches[i].length;
        }
        self.addScore(totalPopped);
    };

    // ==================== UI ====================
    this.createScoreUI();

    // ==================== INPUT (original + debug real) ====================
    this.enableSwipe = true;
    this.game.input.onUp.add(this.clickTileDown, this);
    if (this.enableSwipe) {
        this.game.input.onDown.add(this.clickTileUp, this);
    }

    // Debug key real
    if (this.config.debugMode) {
        this.debugChangeKey = this.game.input.keyboard.addKey(Kiwi.Input.Keycodes.C);
    } else {
        this.debugChangeKey = { isDown: false };
    }
};

/**
 * UI de pontuação (corrigida para Kiwi.js Text constructor).
 */
PlayState.createScoreUI = function () {
    var uiY = 15;
    var fontSize = 32;
    var strokeThick = 5;

    // Score
    this.scoreText = new Kiwi.GameObjects.Text(this, 'Score: 0', 25, uiY);
    this.scoreText.fontSize = fontSize;
    this.scoreText.fontFamily = 'Arial';
    this.scoreText.fill = '#ffffff';
    this.scoreText.stroke = '#000000';
    this.scoreText.strokeThickness = strokeThick;
    this.scoreText.textAlignX = Kiwi.GameObjects.Text.ALIGN_LEFT;
    this.addChild(this.scoreText);

    // High Score
    this.highScoreText = new Kiwi.GameObjects.Text(this, 'High: 0', this.game.stage.width - 220, uiY);
    this.highScoreText.fontSize = fontSize;
    this.highScoreText.fontFamily = 'Arial';
    this.highScoreText.fill = '#ffd700';
    this.highScoreText.stroke = '#000000';
    this.highScoreText.strokeThickness = strokeThick;
    this.highScoreText.textAlignX = Kiwi.GameObjects.Text.ALIGN_RIGHT;
    this.addChild(this.highScoreText);

    // Level
    this.levelText = new Kiwi.GameObjects.Text(this, 'Level: 1', this.game.stage.width / 2 - 70, uiY);
    this.levelText.fontSize = fontSize;
    this.levelText.fontFamily = 'Arial';
    this.levelText.fill = '#00ff88';
    this.levelText.stroke = '#000000';
    this.levelText.strokeThickness = strokeThick;
    this.addChild(this.levelText);

    // Combo
    this.comboText = new Kiwi.GameObjects.Text(this, 'COMBO x1!', this.game.stage.width / 2, uiY + 45);
    this.comboText.fontSize = 48;
    this.comboText.fontFamily = 'Arial';
    this.comboText.fill = '#ffaa00';
    this.comboText.stroke = '#cc0000';
    this.comboText.strokeThickness = strokeThick;
    this.comboText.textAlignX = Kiwi.GameObjects.Text.ALIGN_CENTER;
    this.comboText.alpha = 0;
    this.addChild(this.comboText);

    this.updateScoreUI();
};

PlayState.addScore = function (gemsDestroyed) {
    if (gemsDestroyed <= 0) return;

    var points = gemsDestroyed * this.config.basePointsPerGem * this.combo;
    this.score += points;

    // High score
    if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('match3_highscore', this.highScore);
    }

    // Level
    this.level = Math.floor(this.score / 5000) + 1;

    this.lastMatchTime = this.game.time.now;
    this.combo = Math.min(this.combo + 1, 15);

    this.updateScoreUI();
    this.showComboEffect();
};

PlayState.updateScoreUI = function () {
    this.scoreText.text = 'Score: ' + this.score.toLocaleString();
    this.highScoreText.text = 'High: ' + this.highScore.toLocaleString();
    this.levelText.text = 'Level: ' + this.level;
};

PlayState.showComboEffect = function () {
    if (this.combo <= 1) return;

    this.comboText.text = 'COMBO x' + this.combo + '!';
    this.comboText.alpha = 1;
    this.comboText.scaleX = this.comboText.scaleY = 1.2;

    var tween = this.game.tweens.create(this.comboText);
    tween.to({ alpha: 0, scaleX: 1, scaleY: 1 }, 1200, 'Linear');
    tween.start();
};

PlayState.update = function () {
    Kiwi.State.prototype.update.call(this);

    // Reset combo
    if (this.combo > 1 && (this.game.time.now - this.lastMatchTime > this.config.comboResetDelay)) {
        this.combo = 1;
    }
};

PlayState.clickTileDown = function (mouseX, mouseY) {
    var coord = this.coordMapper.screenToBoard({x: mouseX, y: mouseY});
    if (this.debugChangeKey.isDown || (this.debugChangeKey.isDown === false && this.config.debugMode)) {
        this.logic.debugChangeKey(coord);
    } else {
        this.logic.invertTileSelectionState(coord);
    }
};

PlayState.clickTileUp = function (mouseX, mouseY) {
    var coord = this.coordMapper.screenToBoard({x: mouseX, y: mouseY});
    this.logic.invertTileSelectionState(coord);
};