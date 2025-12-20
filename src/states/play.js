/**
* The PlayState is the core state that is used in the game.
*/
var PlayState = new Kiwi.State('PlayState');

PlayState.create = function () {

    var gemCount = 8;
    var tileSize = {x: 120, y: 120};
    var boardSize = { x: 14, y: 20 };

    // Centraliza o board bonitinho (melhoria leve)
    var offset = {
        x: (this.game.stage.width - boardSize.x * tileSize.x) / 2,
        y: (this.game.stage.height - boardSize.y * tileSize.y) / 2 + 60  // +60 para deixar espaço pro score
    };

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

    this.logic = new MatchThreeLogic(board, animEvents, tileFactory);

    // ==============================
    // === SISTEMA DE PONTUAÇÃO ===
    // ==============================
    this.score = 0;
    this.combo = 1;

    // Texto do score no topo
    this.scoreText = new Kiwi.GameObjects.Text(this, 'Score: 0', 20, 15, 'Arial', 36, 'bold');
    this.scoreText.color = '#ffffff';
    this.scoreText.stroke = '#000000';
    this.scoreText.strokeThickness = 6;
    this.addChild(this.scoreText);

    // Texto do combo (aparece só quando >1)
    this.comboText = new Kiwi.GameObjects.Text(this, '', this.game.stage.width / 2, 20, 'Arial', 40, 'bold');
    this.comboText.color = '#ffff00';
    this.comboText.stroke = '#ff0000';
    this.comboText.strokeThickness = 6;
    this.comboText.textAlign = Kiwi.GameObjects.Text.ALIGN_CENTER;
    this.comboText.alpha = 0;
    this.addChild(this.comboText);

    // Escuta o evento quando gems são destruídas (o mais comum em jogos Match-3 com Kiwi)
    // Teste esses nomes um por um se não funcionar de primeira:
    animEvents.on('tilesPopped', this.onMatch, this);       // mais comum
    // animEvents.on('tilesRemoved', this.onMatch, this);
    // animEvents.on('matchesFound', this.onMatch, this);

    // Input original (não mexe no que já funciona)
    this.game.input.onUp.add(this.clickTileDown, this);
    this.game.input.onDown.add(this.clickTileUp, this);

    // Inicializa o board (se seu código original não tiver, adicione)
    // this.logic.initializeBoard();  // ou initBoard(), fillBoard(), etc. — veja no seu MatchThreeLogic
};

// Função chamada toda vez que há um match
PlayState.onMatch = function (tiles) {
    if (!tiles || tiles.length === 0) return;

    var gemsDestroyed = tiles.length;
    var points = gemsDestroyed * 20 * this.combo;  // 20 pontos base por gem

    this.score += points;
    this.scoreText.text = 'Score: ' + this.score;

    // Combo aumenta
    this.combo++;

    // Mostra combo na tela por 1 segundo
    if (this.combo > 1) {
        this.comboText.text = 'COMBO x' + this.combo;
        this.comboText.alpha = 1;

        // Fade out
        var tween = this.game.tweens.create(this.comboText);
        tween.to({ alpha: 0 }, 1000, Kiwi.Anims.Tweens.Easing.Linear.None, true);
    }
};

// Reset do combo após 3 segundos sem match (opcional, mas legal)
PlayState.update = function () {
    Kiwi.State.prototype.update.call(this);

    // Se passou muito tempo sem match, reseta combo
    // (precisa de uma variável de tempo — adicione se quiser, ou ignore por enquanto)
};

// Seu input original (não mude nada aqui)
PlayState.clickTileDown = function (mouseX, mouseY) {
    var coord = this.coordMapper.screenToBoard({x: mouseX, y: mouseY});
    this.logic.invertTileSelectionState(coord);
};

PlayState.clickTileUp = function (mouseX, mouseY) {
    var coord = this.coordMapper.screenToBoard({x: mouseX, y: mouseY});
    this.logic.invertTileSelectionState(coord);
};