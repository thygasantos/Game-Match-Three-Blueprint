// src/game.js
var gameOptions = {
    width: 1210,
    height: 1550
};

var game = new Kiwi.Game('content', 'Match3', null, gameOptions);

game.states.addState(LoadingState);
game.states.addState(PlayState);
// game.states.addState(IntroState);  // Comente se não usar

game.states.switchState("LoadingState");