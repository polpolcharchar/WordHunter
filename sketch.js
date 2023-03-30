//List of words to be used in the game
let wordList;

//List of words that are in the grid
let existingWords;
let existingPaths;

//List of words that have been found
let foundWords;
let foundScores;
let foundTicks;

//Cells, and the default grid size, created in initVariables()
let cells;
let len = 5;//starts off changable in the menu

//Variables that are used to draw the grid. Calculated based off length in initVariables()
let gridSize;
let selectRadius;
let letterSize;
const gridMargin = 2;

//Variables that are used to draw the info box.
const backgroundColor = 20;
const infoColor = [255, 255, 255];
let meterRadius;
let infoSize;

//Store information about the currently selected tiles
let currentWord;
let currentPath;

//Weighted Random Letter Generator. These weights CAN be adjusted, as weightSum is recalculated in preload()
const weights = [8.12, 1.49, 2.71, 4.32, 12.02, 2.3, 2.03, 5.92, 7.31, 0.1, 0.69, 3.98, 2.61, 6.95, 7.68, 1.82, 0.11, 6.02, 6.28, 9.1, 2.88, 1.11, 2.09, 0.17, 2.11, 0.07];
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let weightSum;

let score = 0;

//game state variables
let gameState;
let mouseReleasedAfterGameBegin = false;
const gameTicks = 9_000;
let gameTicksRemaining;
let pathIndex;
let buttons;

//particle variables
let particleHandler;
let particlesEnabled = false;

//variables for the code generation
let encodedString;

function preload(){

  //calculate the sum of the weights
  weightSum = 0;
  for (let i = 0; i < weights.length; i++) {
    weightSum += weights[i];
  }

  wordList = [];
  //load words from file "words.txt"
  loadStrings("words.txt", function(data) {
    let temp = data;

    //for all the words in temp, add them to words
    for (let i = 0; i < temp.length; i++) {
      if(temp[i].length >= 3){
        wordList.push(temp[i]);
      }
    }
  });
}

function setup() {

  createCanvas(windowWidth, windowHeight);

  initVariables();

  buttons.push(new Button("Play", width / 2 - 100, height / 2 - 50, 200, 100, 50, function() {
    gameState = "game";

    startRandomGame();
  }));
  
  //create a button in the bottom right that says Generate Code
  buttons.push(new Button("Generate Code", width - 205, height - 55, 200, 50, 20, function() {
    let c = generateCode();
    this.enabled = false;

    navigator.clipboard.writeText(c);
    this.text = "Copied to clipboard";

    encodedString = c;
    
  }));

  //create a button in the bottom right that says load code
  buttons.push(new Button("Load Code", width - 205, height - 110, 200, 50, 20, function() {
    let x = navigator.clipboard.readText();
    
    //x is a promise, so we have to wait for it to resolve
    x.then(function(result) {
      encodedString = result;
    });
  }));
}

//base draw
function draw() {

  if (gameState == "menu") {
    drawMenu();
  } else if (gameState == "game") {
    drawGame();

    if(particlesEnabled){
      particleHandler.update();
      particleHandler.draw();
    }

    //check game time remaining
    gameTicksRemaining--;
    if (gameTicksRemaining <= 0) {
      gameState = "end";
      gameTicksRemaining = -1;

      //initialize the first path
      for (let i = 0; i < existingPaths[pathIndex].length; i++) {
        currentPath.push(existingPaths[pathIndex][i].slice());
      }

      //unselect all cells
      setAllCellsUnselected();

      //select the current path
      for(let i = 0; i < existingPaths[pathIndex].length; i++){
        cells[existingPaths[pathIndex][i][0]][existingPaths[pathIndex][i][1]].selected = true;
      }
    }
  }else if(gameState == "end"){
    drawEnd();
  }

}

//high level draw funcitons
function drawMenu(){
  background(backgroundColor);


  for (let i = 0; i < buttons.length; i++) {
    buttons[i].draw();

    //if mouse is pressed over the button, call the button's function
    if (mouseIsPressed) {
      if(buttons[i].enabled && buttons[i].isMouseOver()){
        buttons[i].callback();
      }
    }
  }


  textAlign(CENTER, CENTER);
  textSize(100);
  fill(255);
  text("WordHunter", width / 2, height / 2 - 200);

  //draw text that says "Length: " and the current length of the grid
  textSize(50);
  text("Length: " + len + " (-/+)", width / 2, height / 2 - 100);

  //in the bottom left, draw text that says "Toggle Particles: P", and draw a circle that is either white or black depending on whether particles are enabled
  textSize(20);
  textAlign(LEFT, BOTTOM);
  fill(particlesEnabled ? 255 : 0);
  text("Toggle Particles: P", 5, height - 5);
}

function drawEnd(){
  background(backgroundColor);

  drawCells();

  try{
    //for each point in currentPath, move it slightly closer to the point at the same index in existingPaths[pathIndex]
    for (let i = 0; i < currentPath.length; i++) {
      currentPath[i][0] += (existingPaths[pathIndex][i][0] - currentPath[i][0]) / 10;
      currentPath[i][1] += (existingPaths[pathIndex][i][1] - currentPath[i][1]) / 10;
    }
  }catch (e){
    //sometimes the first path is just a list of numbers
    //adding a try catch fixes it, it still does what i want somehow
  }

  //draw the path at existingPaths[pathIndex] as a curve
  noFill();
  //stroke(20, 80, 255, sin(frameCount / 10) * 50 + 200);
  stroke(20, 80, 255);
  strokeWeight(5);
  beginShape();
  for (let i = 0; i < currentPath.length; i++) {
    if(i == 0 || i == currentPath.length - 1){
      vertex(currentPath[i][0] * gridSize + gridSize / 2 + (width - len * gridSize) / 2, currentPath[i][1] * gridSize + gridSize / 2 + (height - len * gridSize) / 2);
    }
    curveVertex(currentPath[i][0] * gridSize + gridSize / 2 + (width - len * gridSize) / 2, currentPath[i][1] * gridSize + gridSize / 2 + (height - len * gridSize) / 2);
  }
  endShape();

  //draw a green circle at the beginning and a red at the end of the path
  fill(0, 255, 0);
  ellipse(existingPaths[pathIndex][0][0] * gridSize + gridSize / 2 + (width - len * gridSize) / 2, existingPaths[pathIndex][0][1] * gridSize + gridSize / 2 + (height - len * gridSize) / 2, 20, 20);

  fill(255, 0, 0);
  ellipse(existingPaths[pathIndex][existingPaths[pathIndex].length - 1][0] * gridSize + gridSize / 2 + (width - len * gridSize) / 2, existingPaths[pathIndex][existingPaths[pathIndex].length - 1][1] * gridSize + gridSize / 2 + (height - len * gridSize) / 2, 20, 20);

  noStroke();
  drawWord(existingWords[pathIndex]);

  drawLetters();

  drawScore();

  //draw on the right side of the screen the words that were found and the percentage of the total words found
  textAlign(LEFT, TOP);
  textSize(infoSize);
  fill(infoColor);
  let t = "Words found: " + foundWords.length + "/" + existingWords.length;
  text(t, width - textWidth(t) - 10, 10 + 10 + infoSize * 1.5 * 2);
  // t = "Score: " + (score * 100 / 100);
  // text(t, width - textWidth(t) - 10, 10 + 10 + infoSize * 1.5 * 3);

}

function drawGame(){
  checkMousePosition();

  background(backgroundColor);

  
  drawCells();

  drawCurrentPath();

  drawLetters();

  drawScore();
  
  drawWord(currentWord);

  drawTicksRemainingMeter();


  drawWordPairs();
}

//Control Functions
function startRandomGame(){

  //reset the score
  score = 0;

  //reset the found words
  foundWords = [];
  foundScores = [];
  foundTicks = [];

  //reset the current word
  currentWord = "";
  currentPath = [];

  //create a lenxlen grid of letters
  cells = [];

  //if encodedString is not empty, use it
  if(encodedString != "" && encodedString != undefined){
    // console.log("Using encoded string: " + encodedString);
    let encodedLetters = atob(encodedString).split("");
    len = Math.sqrt(encodedLetters.length);
    for (let i = 0; i < len; i++) {
      cells.push([]);
      for (let j = 0; j < len; j++) {
        cells[i].push(new Cell(encodedLetters[i * len + j]));
      }
    }
  }else{
    //otherwise, generate a random grid
    for (let i = 0; i < len; i++) {
      cells.push([]);
      for (let j = 0; j < len; j++) {
        // let letter = String.fromCharCode(floor(random(65, 91)));
        cells[i].push(new Cell(getWeightedRandomLetter()));
      }
    }
  }

  gridSize = min(width * 0.9, height * 0.9) / len;
  selectRadius = gridSize / 2;
  letterSize = gridSize * 0.6;

  let letters = [];
  for (let i = 0; i < cells.length; i++) {
    letters.push([]);
    for (let j = 0; j < cells[i].length; j++) {
      letters[i].push(cells[i][j].letter);
    }
  }
  let pairs = generateAllPairs(letters);
  existingPaths = [];
  existingWords = [];
  for (let i = 0; i < pairs.length; i++) {
    existingWords.push(pairs[i][0]);
    existingPaths.push(pairs[i][1]);
  }

  for(let i = 0; i < existingWords.length; i++){
    //c0nsole.log(existingWords[i]);
  }
}

function initVariables(){
  cells = [];
  existingWords = [];
  existingPaths = [];
  foundWords = [];
  foundScores = [];
  foundTicks = [];
  score = 0;
  gameTicksRemaining = gameTicks;

  gameState = "menu";
  pathIndex = 0;
  buttons = [];

  currentWord = "";
  currentPath = [];



  gridSize = min(width * 0.9, height * 0.9) / len;
  selectRadius = gridSize / 2;
  letterSize = gridSize * 0.6;

  infoSize = height / 20;
  meterRadius = height / 10;

  particleHandler = new ParticleHandler();
}

//simple draw functions
//fix me
function drawTicksRemainingMeter(){
  //draw a circular meter that shows how much time is left
  //it will empty clockwise, starting from the top
  fill(infoColor);
  stroke(0);
  ellipse(width - meterRadius - 10, 10 + infoSize * 1.5 * 2 + meterRadius, meterRadius * 2, meterRadius * 2);
  fill(0);
  noStroke();
  if(gameTicksRemaining > gameTicks){
    //just draw a full circle
    //ellipse(width - meterRadius - 10, 10 + infoSize * 1.5 * 2 + meterRadius, meterRadius * 2, meterRadius * 2);
  }else{
    arc(width - meterRadius - 10, 10 + infoSize * 1.5 * 2 + meterRadius, meterRadius * 2, meterRadius * 2, -PI / 2, -PI / 2 - 2 * PI * gameTicksRemaining / gameTicks, PIE);
  }

}

function drawCurrentPath(){
  //draw the current path
  //it is a list of pairs of indices
  stroke(0);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let i = 0; i < currentPath.length; i++) {
    if(i == 0 || i == currentPath.length - 1){
      vertex(currentPath[i][0] * gridSize + gridSize / 2 + (width - len * gridSize) / 2, currentPath[i][1] * gridSize + gridSize / 2 + (height - len * gridSize) / 2);
    }
    curveVertex(currentPath[i][0] * gridSize + gridSize / 2 + (width - len * gridSize) / 2, currentPath[i][1] * gridSize + gridSize / 2 + (height - len * gridSize) / 2);
  }
  endShape();
}

function drawScore(){
  textAlign(LEFT, TOP);
  //draw the score rounded to 2 decimal places above the grid
  fill(infoColor);
  textSize(infoSize);
  //text("Score: " + round(score * 100) / 100, (width - len * gridSize) / 2, (height - len * gridSize) / 2 - 15);
  let t = "Score: " + round(score * 100) / 100;
  text(t, width - textWidth(t) - 10, 10);
}

function drawWord(word){
  textAlign(LEFT, TOP);
  //draw the word above the grid, on the top right
  fill(infoColor);
  textSize(infoSize);
  // text(word, (width - len * gridSize) / 2 + len * gridSize - textWidth(word), (height - len * gridSize) / 2 - 10);
  let t = "Word: " + word;
  text(t, width - textWidth(t) - 10, 10 + infoSize * 1.5);
}

function drawLetters(){
  textAlign(CENTER, CENTER);
  //draw the letters centered in the canvas
  noStroke();
  for (let i = 0; i < cells.length; i++) {
    for (let j = 0; j < cells[i].length; j++) {
      fill(0);
      textSize(letterSize);

      //draw the ltter centered in the cell
      text(cells[i][j].letter, i * gridSize + gridSize / 2 + (width - len * gridSize) / 2, j * gridSize + gridSize / 2 + (height - len * gridSize) / 2);
    }
  }
}

function drawCells(){
  let isCurrentSelectedAWord = isWord(currentWord);
  let isCurrentAlreadyFound = foundWords.includes(currentWord);

  let mouseCellX = floor((mouseX - (width - len * gridSize) / 2) / gridSize);
  let mouseCellY = floor((mouseY - (height - len * gridSize) / 2) / gridSize);

  //draw the grid of letters centered in the canvas
  noStroke();
  for (let i = 0; i < cells.length; i++) {
    for (let j = 0; j < cells[i].length; j++) {
      //if the letter is selected, fill the cell with red
      if (cells[i][j].selected) {
        if(gameState == "end"){

          if(foundWords.includes(existingWords[pathIndex])){
            fill(0, 255, 0, sin(frameCount / 20) * 35 + 200);
          }else{
            fill(0, 0, 255, sin(frameCount / 20) * 35 + 220);
          }          

        } else if (isCurrentSelectedAWord) {
          if(isCurrentAlreadyFound){
            fill(255, 255, 0);
          }else{
            fill(0, 255, 0);
          }
        }else{
          fill(255, 0, 0);
        }
      }//otherwise, fill the cell with white
      else if (i == mouseCellX && j == mouseCellY) {
        fill(sin(frameCount / 15) * 20 + 235, sin(frameCount / 15) * 20 + 235, sin(frameCount / 15) * 20 + 235);
      }else{
        fill(255);
      }
      //draw the cell
      rect(i * gridSize + (width - len * gridSize) / 2 + gridMargin / 2, j * gridSize + (height - len * gridSize) / 2 + gridMargin / 2, gridSize - gridMargin, gridSize - gridMargin, 5);
      
      
    }
  }
}

function drawWordPairs(){
  //on the left side of the screen, draw the word/score pairs
  for (let i = 0; i < foundWords.length; i++) {
    if(foundTicks[i] > 2000)continue;

    fill(map(foundTicks[i], 1500, 2000, 0, backgroundColor), map(foundTicks[i], 1500, 2000, 62, backgroundColor), map(foundTicks[i], 1500, 2000, 232, backgroundColor));


    textSize(infoSize);
    let leftText = foundWords[i] + "  +";
    text(leftText, 10, 10 + (i + 1) * infoSize);
    text(round(foundScores[i] * 100) / 100, 10 + textWidth(leftText), 10 + (i + 1) * infoSize);
    foundTicks[i]++;
  }
}

//code generation methods
function generateCode(){
  //create a len x len string of random letters
  let code = "";
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < len; j++) {
      code += getWeightedRandomLetter();
    }
  }
  //default encoding
  return btoa(code);
}

function resetCodeButton(){
  buttons[1].text = "Generate Code";
  buttons[1].enabled = true;
  buttons[1].textSize = 20;
  encodedString = "";
}

//input methods
function mouseReleased(){
  if(gameState == "end"){
    return;
  }

  if(gameState == "game"){

    if(!mouseReleasedAfterGameBegin){
      mouseReleasedAfterGameBegin = true;
      setAllCellsUnselected();
    }else{
      
      //if the word is a found word, print it
      if(foundWords.includes(currentWord)){
        //c0nsole.log("You already found " + currentWord);
      } else if (existingWords.includes(currentWord)) {
        let wordScore = getWordScore(currentWord);
  
        score += wordScore;
  
        //insert them into the beginning of the list
        foundWords.unshift(currentWord);
        foundScores.unshift(wordScore);
        foundTicks.unshift(0);
  
  
  
        //gameTicksRemaining += wordScore * 100;
        gameTicksRemaining += 50;
  
        //add particles along the path
        if(particlesEnabled){
          for (let i = 0; i < currentPath.length; i++) {
            for(let n = 0; n < 80 / currentPath.length; n++){
              particleHandler.addParticle(currentPath[i][0] * gridSize + gridSize / 2 + (width - len * gridSize) / 2
              , currentPath[i][1] * gridSize + gridSize / 2 + (height - len * gridSize) / 2
              , 10
              , [Math.random() * 15, Math.random() * 80, 200 + Math.random() * 50]
              , 100);
            }
          }
        }
  
      }else if(currentWord != ""){
        console.log(currentWord + " is not a word");
        gameTicksRemaining -= 150;
        score -= 1;
        if(score < 0)score = 0;
      }
  
      //reset the word
      currentWord = "";
      currentPath = [];
  
      setAllCellsUnselected();

    }
  }
}

function keyPressed(){
  if(gameState == "end"){

    //when the left/right arrow keys are pressed, increase/decrease pathindex
    if(keyCode == LEFT_ARROW){
      pathIndex--;
      if(pathIndex < 0)pathIndex = existingPaths.length - 1;
    }else if(keyCode == RIGHT_ARROW){
      pathIndex++;
      if(pathIndex >= existingPaths.length){
        pathIndex = 0;
      }
    }


    while(currentPath.length < existingPaths[pathIndex].length){
      currentPath.push([currentPath[0][0], currentPath[0][1]]);
    }


    while(currentPath.length > existingPaths[pathIndex].length){
      currentPath.pop();
    }


    setAllCellsUnselected();
    for(let i = 0; i < existingPaths[pathIndex].length; i++){
      cells[existingPaths[pathIndex][i][0]][existingPaths[pathIndex][i][1]].selected = true;
    }



  }else if(gameState == "game"){
    //if the z key is pressed, set gameTicks to 0
    if(key == "z"){
      gameTicksRemaining = 0;
    }
  }else if(gameState == "menu"){
    if(key == '=' || key == '+'){
      len++;
      resetCodeButton();
    }else if(key == '-' || key == '_'){
      len--;
      if(len < 3)len = 3;
      resetCodeButton();
    }else if(key == 'p'){
      particlesEnabled = !particlesEnabled;
    }
  }
}

function windowResized() {
  buttons = [];
  setup();
  
}

function checkMousePosition(){
  //if the mouse is pressed over an unselected cell, select it and add the letter to the word
  if (mouseIsPressed && mouseReleasedAfterGameBegin) {

    //if the mouse is within a circle of radius selectRadius around the center of the cell, select the cell
    let xIndex = floor((mouseX - (width - len * gridSize) / 2) / gridSize);
    let yIndex = floor((mouseY - (height - len * gridSize) / 2) / gridSize);

    if (xIndex >= 0 && xIndex < cells.length && yIndex >= 0 && yIndex < cells[xIndex].length) {

      //if the next index is not adjacent to the current index, deselect the current index
      if (currentPath.length > 0) {
        let last = currentPath[currentPath.length - 1];
        if (abs(xIndex - last[0]) > 1 || abs(yIndex - last[1]) > 1) {
          setAllCellsUnselected();
          currentWord = "";
          currentPath = [];
        }
      }

      if (dist(mouseX, mouseY, xIndex * gridSize + gridSize / 2 + (width - len * gridSize) / 2, yIndex * gridSize + gridSize / 2 + (height - len * gridSize) / 2) < selectRadius) {
        if (cells[xIndex][yIndex].selected == false) {
          cells[xIndex][yIndex].selected = true;
          currentWord += cells[xIndex][yIndex].letter;
          currentPath.push([xIndex, yIndex]);
        }
      }
    }
  }
}

//cell methods/classes
function setAllCellsUnselected(){
  for (let i = 0; i < cells.length; i++) {
    for (let j = 0; j < cells[i].length; j++) {
      cells[i][j].selected = false;
    }
  }
}

class Cell {
  constructor(letter){
    this.letter = letter;
    this.selected = false;
  }
}

//button methods/classes
class Button {
  constructor(text, x, y, w, h, textSize, callback){
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.text = text;
    this.callback = callback;
    this.enabled = true;
    this.textSize = textSize;
  }

  draw(){
    noStroke();
    if(this.isMouseOver()){
      fill(255);
      stroke(0);
      strokeWeight(3);
    }else{
      fill(220);
    }
    rect(this.x, this.y, this.w, this.h, 12);

    fill(0);
    noStroke();
    textSize(this.textSize);
    textAlign(LEFT, CENTER);
    text(this.text, this.x + this.w / 2 - textWidth(this.text) / 2, this.y + this.h / 2 + 10 / 2);
  }

  isMouseOver(){
    return mouseX > this.x && mouseX < this.x + this.w && mouseY > this.y && mouseY < this.y + this.h;
  }
}

//word methods
function getWordScore(word){
  let score = 0;
  for (let i = 0; i < word.length; i++) {
    score += getLetterScore(word[i]);
  }
  score *= 2;

  //return the score rounded to 2 decimal places
  return round(score * 100) / 100;
}

function getLetterScore(letter){
  let index = letters.indexOf(letter);

  return 1 / weights[index];
}

function isWord(word){ 
  //convert the word to uppercase
  word = word.toUpperCase();

  let index = binarySearch(word);
  //if the word at index is equal to the word, return true
  if (wordList[index] == word) {
    return true;
  }

  return false;

}

function getWeightedRandomLetter(){
  //using the weights variable, generate a random letter
  //the first index represents the weight of A, the second index represents the weight of B, etc.

  //generate a random number between 0 and the sum of all the weights
  let r = random(0, weightSum);

  //loop over the weights array
  for (let i = 0; i < weights.length; i++) {
    //if the random number is less than the weight at index i
    if (r < weights[i]) {
      //return the letter at index i
      return String.fromCharCode(i + 65);
    } else {
      //subtract the weight at index i from the random number
      r -= weights[i];
    }
  }

  return "!";
}

//Solver Methods/Classes
function getCopyOfPath(path){
  let newPath = [];
  for (let i = 0; i < path.length; i++) {
    newPath.push([path[i][0], path[i][1]]);
  }
  return newPath;
}

function getEmptySeen(){
  let seen = [];
  for (let i = 0; i < len; i++) {
    seen.push([]);
    for (let j = 0; j < len; j++) {
      seen[i].push(false);
    }
  }
  return seen;
}

function wordPotential(word){
  //convert the word to uppercase
  word = word.toUpperCase();

  let index = binarySearch(word);

  //if word is a prefix of the word at index, return true
  if (index < wordList.length && wordList[index].startsWith(word)) {
    return true;
  }
  //if word is a prefix of the word at index - 1, return true
  // if (words[index - 1].startsWith(word)) {
  //   return true;
  // }

  return false;

}

function /*UNUSED*/generateAllWords(letters){
  let existingWords = [];

  //loop over the letters array
  for (let i = 0; i < letters.length; i++) {
    for (let j = 0; j < letters[i].length; j++) {

      //create a new seen object
      let seen = getEmptySeen();
      seen[i][j] = true;

      //create searchstate
      let searchState = new SearchState(letters[i][j], i, j, seen);

      //create a queue
      let queue = [];
      queue.push(searchState);

      //while the queue is not empty
      while (queue.length > 0) {
        //remove the first element from the queue
        //print the word
        let current = queue.shift();

        //if the word is a word, add it to the words array
        if (isWord(current.word)) {
          existingWords.push(current.word);
        }

        //loop over the neighbors
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            //if the neighbor is not out of bounds
            if (current.x + x >= 0 && current.x + x < letters.length && current.y + y >= 0 && current.y + y < letters[current.x + x].length) {
              //if the neighbor has not been seen
              if (current.seen[current.x + x][current.y + y] == false) {
                //create a new word
                let newWord = current.word + letters[current.x + x][current.y + y];
                //if the word is a potential word
                if (wordPotential(newWord)) {
                  //create a new seen object
                  let newSeen = getEmptySeen();
                  for (let i = 0; i < current.seen.length; i++) {
                    for (let j = 0; j < current.seen[i].length; j++) {
                      newSeen[i][j] = current.seen[i][j];
                    }
                  }
                  newSeen[current.x + x][current.y + y] = true;

                  //create a new search state
                  let newSearchState = new SearchState(newWord, current.x + x, current.y + y, newSeen);

                  //add the new search state to the queue
                  queue.push(newSearchState);
                }
              }
            }
          }
        }

      }
    }
  }

  //sort existingWords by length then alphabetically
  existingWords.sort(function(a, b) {
    if (a.length == b.length) {
      return a.localeCompare(b);
    } else {
      return b.length - a.length;
    }
  });

  //remove all duplicates
  for (let i = 0; i < existingWords.length; i++) {
    if (existingWords[i] == existingWords[i + 1]) {
      existingWords.splice(i, 1);
      i--;
    }
  }

  //print all the existingWords
  // for (let i = 0; i < existingWords.length; i++) {
  //   c0nsole.log(existingWords[i]);
  // }

  return existingWords;
}

function generateAllPairs(letters){
  let pairs = [];

  //loop over the letters array
  for (let i = 0; i < letters.length; i++) {
    for (let j = 0; j < letters[i].length; j++) {

      //create a new seen object
      let seen = getEmptySeen();
      seen[i][j] = true;

      //create searchstate
      let searchState = new SearchState(letters[i][j], i, j, seen, [[i, j]]);

      //create a queue
      let queue = [];
      queue.push(searchState);

      //while the queue is not empty
      while (queue.length > 0) {
        //remove the first element from the queue
        //print the word
        let current = queue.shift();

        //if the word is a word, add it to the words array
        if (isWord(current.word)) {
          pairs.push([current.word, current.path]);
        }

        //loop over the neighbors
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            //if the neighbor is not out of bounds
            if (current.x + x >= 0 && current.x + x < letters.length && current.y + y >= 0 && current.y + y < letters[current.x + x].length) {
              //if the neighbor has not been seen
              if (current.seen[current.x + x][current.y + y] == false) {
                //create a new word
                let newWord = current.word + letters[current.x + x][current.y + y];
                //if the word is a potential word
                if (wordPotential(newWord)) {
                  //create a new seen object
                  let newSeen = getEmptySeen();
                  for (let i = 0; i < current.seen.length; i++) {
                    for (let j = 0; j < current.seen[i].length; j++) {
                      newSeen[i][j] = current.seen[i][j];
                    }
                  }
                  newSeen[current.x + x][current.y + y] = true;

                  let newPath = getCopyOfPath(current.path);
                  newPath.push([current.x + x, current.y + y]);

                  //create a new search state
                  let newSearchState = new SearchState(newWord, current.x + x, current.y + y, newSeen, newPath);

                  //add the new search state to the queue
                  queue.push(newSearchState);
                }
              }
            }
          }
        }

      }
    }
  }

  

  //sort existingWords by length then alphabetically
  pairs.sort(function(a, b) {
    if (a[0].length == b[0].length) {
      return a[0].localeCompare(b[0]);
    } else {
      return b[0].length - a[0].length;
    }
  });

  

  return pairs;
}

function binarySearch(word){
  //convert the word to lowercase
  word = word.toUpperCase();


  let left = 0;
  let right = wordList.length - 1;

  while (left <= right) {
    let mid = floor((left + right) / 2);
    let guess = wordList[mid];

    if (guess == word) {
      return mid;
    } else if (guess > word) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return left;
}

class SearchState{
  constructor(word, x, y, seen, path){
    this.word = word;
    this.x = x;
    this.y = y;
    this.seen = seen;
    this.path = path;
  }
}



//particles
class ParticleHandler{
  constructor(){
    this.particles = [];
  }

  update(){
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].update();

      if (this.particles[i].l <= 0) {
        this.removeParticle(i);
        i--;
      }
    }
  }

  draw(){
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw();
    }
  }

  addParticle(x, y, r, c, l){
    this.particles.push(new Particle(x, y, r, c, l));
  }

  removeParticle(index){
    this.particles.splice(index, 1);
  }
}

class Particle{
  constructor(x, y, r, c, l){
    this.x = x;
    this.y = y;
    this.r = r;
    this.c = c;
    this.xSpeed = Math.random() * 5 - 2.5;
    this.ySpeed = Math.random() * 5 - 2.5;
    this.l = l;
  }

  update(){
    this.x += this.xSpeed;
    this.y += this.ySpeed;

    this.ySpeed += 0.1;
    this.l--;
  }

  draw(){
    noStroke();
    fill(map(this.l, 20, 0, this.c[0], backgroundColor), map(this.l, 20, 0, this.c[1], backgroundColor), map(this.l, 20, 0, this.c[2], backgroundColor));
    ellipse(this.x, this.y, this.r, this.r);
  }
}
