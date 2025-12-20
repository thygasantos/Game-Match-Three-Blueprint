/**
 * The PlayState is the core state that is used in the game.
 */
var PlayState = new Kiwi.State('PlayState');

PlayState.create = function () {
    this.config = {
        gemCount: 8,
        tileSize: { x: 120, y: 120 },
        boardSize: { x: 14, y: 20 },
        enableSwipe: true,
        basePointsPerGem: 20,       // Pontos por gem destruída
        comboResetDelay: 3000       // 3 segundos sem atividade reseta combo
    };

    // Centraliza o board
    var boardPixelWidth = this.config.boardSize.x * this.config.tileSize.x;
    var boardPixelHeight = this.config.boardSize.y * this.config.tileSize.y;
    var offset = {
        x: (this.game.stage.width - boardPixelWidth) / 2,
        y: (this.game.stage.height - boardPixelHeight) / 2 + 50  // Espaço para UI
    };

    // Pontuação
    this.score = 0;
    this.combo = 1;
    this.lastMatchTime = 0;

    var spritesheet = this.textures.gems;
    this.coordMapper = new CoordMapper(this.config.tileSize, offset);
    this.animEvents = new AnimEvents();
    var board = new Board(this.config.boardSize);
    var tileFactory = MatchThreeTile.createFactory(
        this, spritesheet, this.config.gemCount, this.coordMapper, this.animEvents
    );

    this.logic = new MatchThreeLogic(board, this.animEvents, tileFactory);

    // UI de pontuação
    this.createScoreUI();

    // Input original (mais estável)
    this.game.input.onUp.add(this.onMouseUp, this);
    if (this.config.enableSwipe) {
        this.game.input.onDown.add(this.onMouseDown, this);
    }

    // Escuta evento de gems destruídas (o mais seguro – ajuste o nome se for diferente no seu AnimEvents)
    this.animEvents.on('tilesRemoved', this.onTilesRemoved, this);  // Ou 'matchesFound', 'popped', etc. Teste!

    // Inicializa o board (importante! Muitos travam aqui se não chamar)
    this.logic.initBoard();  // Se não existir, chame manualmente board.fill() ou equivalente
};

PlayState.createScoreUI = function () {
    var y = 20;
    this.scoreText = new Kiwi.GameObjects.Text(this, 'Score: 0', 20, y, 'Arial', 32, '#ffffff');
    this.scoreText.textAlign = 'left';
    this.addChild(this.scoreText);

    this.comboText = new Kiwi.GameObjects.Text(this, '', this.game.stage.width / 2, y, 'Arial', 28, '#ffaa00');
    this.comboText.textAlign = 'center';
    this.addChild(this.comboText);
};

PlayState.addScore = function (gemsDestroyed) {
    var points = gemsDestroyed * this.config.basePointsPerGem * this.combo;
    this.score += points;
    this.scoreText.text = 'Score: ' + this.score;

    if (this.combo > 1) {
        this.comboText.text = 'Combo x' + this.combo + ' !';
    }

    this.combo++;
    this.lastMatchTime = this.game.time.now;
};

// Callback quando gems são removidas (ajuste o nome do evento conforme seu código!)
PlayState.onTilesRemoved = function (tiles) {
    if (tiles && tiles.length > 0) {
        this.addScore(tiles.length);
    }
};

// Input corrigido (volta ao estilo original + swipe simples)
PlayState.selectedCoord = null;

PlayState.onMouseDown = function (x, y) {
    var coord = this.coordMapper.screenToBoard({ x: x, y: y });
    if (this.logic.board.isValidCoord(coord)) {
        this.selectedCoord = coord;
        this.logic.invertTileSelectionState(coord);  // Highlight
    }
};

PlayState.onMouseUp = function (x, y) {
    if (!this.selectedCoord) return;

    var coord = this.coordMapper.screenToBoard({ x: x, y: y });
    if (this.logic.board.isValidCoord(coord)) {
        if (this.areAdjacent(this.selectedCoord, coord)) {
            this.logic.swapTiles(this.selectedCoord, coord);  // Seu método de swap original
            this.lastMatchTime = this.game.time.now;  // Atualiza tempo para combo
        }
        this.logic.invertTileSelectionState(this.selectedCoord);  // Deshighlight
    }
    this.selectedCoord = null;
};

PlayState.areAdjacent = function (c1, c2) {
    var dx = Math.abs(c1.x - c2.x);
    var dy = Math.abs(c1.y - c2.y);
    return (dx + dy === 1);
};

PlayState.update = function () {
    Kiwi.State.prototype.update.call(this);

    // Reset combo se demorar muito entre matches
    if (this.combo > 1 && (this.game.time.now - this.lastMatchTime > this.config.comboResetDelay)) {
        this.combo = 1;
        this.comboText.text = '';
    }
};