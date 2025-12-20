/**
* The Loading State is going to be used to load in all of the in-game assets that we need in game.
*/

var LoadingState = new KiwiLoadingScreen('LoadingState', 'PlayState', 'assets/img/loading/');
// Mudamos para ir direto para PlayState (se você tem IntroState, deixe 'IntroState')

LoadingState.preload = function () {
    
    // Sempre chame o super primeiro para carregar o logo do Kiwi
    KiwiLoadingScreen.prototype.preload.call(this);

    // CORREÇÃO PRINCIPAL:
    // Carrega a spritesheet das gems com o tamanho correto (120x120)
    // Use o caminho da imagem correta do seu projeto Match-3
    this.addSpriteSheet('gems', 'assets/img/gems.png', 120, 120);
    
    // Se não tiver uma pasta/imagem chamada gems.png, veja qual é a correta.
    // Exemplos comuns em tutoriais Match-3 com Kiwi.js:
    // 'assets/gems.png'
    // 'assets/img/gem-sheet.png'
    // 'assets/sprites/gems.png'
    
    // Se você não souber qual é, procure na pasta assets/img por uma imagem com várias gems coloridas em grid.
};