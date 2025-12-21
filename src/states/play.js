/**
* The PlayState is the core state that is used in the game.
*/
var PlayState = new Kiwi.State('PlayState');

/**
* This create method is executed when Kiwi Game reaches the boot stage of the
* game loop.
*
* It takes care of initializing all the game logic and resources.
*
* @method create
* @public
*/
PlayState.create = function () {

    /**
     * The gem count controls the amount of varying gems that there should
     * be on the board at a single time.
     * For example if you set this to 8, then there will be 8 different
     * types of gems on the board.
     *
     * (NOTE: setting this too low causes matches to occur too frequently,
     * thus causing the game to enter an almost infinite loop when trying
     * to initialize the board; setting it too high on the other hand can make
     * the game too difficult for the player).
     */
    var gemCount = 8;

    /*
     * If you want to be more tricky you can also dynamically set the
     * gemCount to be the same as the number of cells/frames in
     * a spritesheet.
     *
     * To try this out use the line which is commented out below.
     */
    // gemCount = this.textures.gems.cells.length;

    /**
     * The width/height of a single tile.
     **/
    var tileSize = {x: 120, y: 120};

    /*
     * The width/height of the board in tiles.
     *
     * Again if you want to be tricky you could always make the
     * width/height of the board in tiles match the Stages width/height.
     */
    var boardSize = { x: 14, y: 20 };

    var basePointsPerGem = 25;      
    var comboResetDelay = 4000;  // ms sem match para resetar combo
  

    /*
     * The offset of the board in screen coordinates.
     */
    var offset = {x: 0, y: 0};


    // ==================== SISTEMA DE PONTUAÇÃO ====================
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('match3_highscore') || '0', 10);
    this.combo = 1;
    this.lastMatchTime = 0;
    this.level = 1;  // Aumenta a cada 5000 pontos



    var spritesheet = this.textures.gems;
    this.coordMapper = new CoordMapper(tileSize, offset);
    var animEvents = new AnimEvents();
    var board = new Board(boardSize);
    var tileFactory = MatchThreeTile.createFactory(
        this,
        spritesheet,
        gemCount,
        this.coordMapper,
        animEvents
        );

    /*
     * Here we initialize the class that encapsulates all game logic.
     */
    this.logic = new MatchThreeLogic(board, animEvents, tileFactory);


     // ============= UI DE PONTUAÇÃO BONITA ===================
    this.createScoreUI();

    // ==================== INPUT MELHORADO ====================
    this.enableSwipe = true;
    



    /*
     * Register onClick callbacks.
     */
    this.game.input.onUp.add(this.clickTileDown, this);
    if(this.enableSwipe) {
        this.game.input.onDown.add(this.clickTileUp, this);
    }

    /*
     * Key to change tiles at will, useful for debugging purposes.
     */
    // this.debugChangeKey = this.game.input.keyboard.addKey(Kiwi.Input.Keycodes.C);
    this.debugChangeKey = {isDown:false};
}

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
* This method is continuously executed.
* @method update
* @public
*/
PlayState.update = function(){
    Kiwi.State.prototype.update.call(this);

    /*
     * Here we don't need to do anything regarding our game logic as all game
     * activity is triggered by the following events:
     * - user generated events (e.g. clicks, see below)
     * - internal events (e.g. when an animation completes)
     */
}


/**
* This method is executed when a gem is clicked.
* @method clickTileDown
* @public
*/
PlayState.clickTileDown = function (mouseX, mouseY) {
    var coord = this.coordMapper.screenToBoard({x: mouseX, y: mouseY});
    if (this.debugChangeKey.isDown) {
        this.logic.debugChangeKey(coord);
    } else {
        this.logic.invertTileSelectionState(coord);
    }
}

PlayState.clickTileUp = function (mouseX, mouseY) {
    var coord = this.coordMapper.screenToBoard({x: mouseX, y: mouseY});
    this.logic.invertTileSelectionState(coord);
}