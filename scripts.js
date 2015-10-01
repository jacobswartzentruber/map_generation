//Shim to account for browsers that do not support requestAnimationFrame
(function() {
    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    window.requestAnimationFrame = requestAnimationFrame;
})();

//Define all game variables and parameters
var canvas = document.getElementById("canvas"),
    ctx = canvas.getContext("2d"),
    mapSize = 64,
    cellSize = 10,
    maxElevation = 200,
    maxElevRandomize = 15,
    numStepsRandomize = 2,
    maxTemperature = 100,
    maxTempStep = 25,
    lowTemp = 10,
    highTemp = 80,
    equatorPosition = mapSize/2,
    maxPrecipitation = 100,
    maxPrecRandomize = 10,
    precipitationDensity = 0.5,
    oceanLevel = 70,
    map = [],
    mapChanged = false,
    viewChanged = false,
    simulationRunning = false,
    currentFrame = 0;
    framesPerTurn = 20;
    currentView = "elevation";
    vegetationSpecies = [];
    numVegSpecies = 20;
    roundsVegRandomize = 3;
    biomeVegTolerance = 0.1; //Amount of tolerance biomes allows on either side of its ideal soil richness for vegetation growth

//Access BiomeKey by [TemperatureZone][MoistureZone]
var biomeKey = [["Scorched","Bare","Tundra","Snow","Snow","Snow"],
                ["Temperate Desert","Temperate Desert","Shrubland","Shrubland","Taiga","Taiga"],
                ["Temperate Desert","Temperate Desert","Shrubland","Temperate Deciduous Rainforest","Temperate Deciduous Rainforest","Taiga"],
                ["Temperate Desert","Grassland","Grassland","Temperate Deciduous Rainforest","Temperate Deciduous Rainforest","Temperate Rainforest"],
                ["Subtropical Desert","Grassland","Grassland","Temperate Deciduous Rainforest","Temperate Deciduous Rainforest","Temperate Rainforest"],
                ["Subtropical Desert","Grassland","Tropical Seasonal Forest","Tropical Seasonal Forest","Tropical Rainforest","Tropical Rainforest"]];
var biomeStats = {"Scorched": {color: "120,120,120", soilRichness: 0},
                  "Bare": {color: "150,150,150", soilRichness: 0.01},
                  "Tundra": {color: "195,195,136", soilRichness: 0.04}, 
                  "Snow": {color: "248,248,248", soilRichness: 0.02}, 
                  "Temperate Desert": {color: "216, 222, 176", soilRichness: 0.05},
                  "Shrubland": {color: "157, 177, 134", soilRichness: 0.15}, 
                  "Taiga": {color: "171, 196, 115", soilRichness: 0.15},
                  "Grassland": {color: "165, 214, 87", soilRichness: 0.20},
                  "Temperate Deciduous Rainforest": {color: "132, 190, 100", soilRichness: 0.45},
                  "Temperate Rainforest": {color: "93, 177, 103", soilRichness: 0.50},
                  "Subtropical Desert": {color: "209, 184, 137", soilRichness: 0.03},
                  "Tropical Seasonal Forest": {color: "120, 172, 114", soilRichness: 0.60},
                  "Tropical Rainforest": {color: "71, 123, 93", soilRichness: 0.80},
                  "Ocean": {color: "0,0,100", soilRichness: 0}
                };

canvas.width =  mapSize * cellSize;
canvas.height = mapSize * cellSize;

//Initialize blank map array with correct width
for(var i=0; i<mapSize; i++){
  map.push([]);
}

// The update function which calculates each animation frame
function update(){
  currentFrame += 1;
  if(simulationRunning && currentFrame%framesPerTurn === 0){
    roundsVegRandomize > 0 ? spawnVegetation(true) : spawnVegetation(false);
    roundsVegRandomize--;
    console.log(framesPerTurn+" "+currentFrame);
  } 
  for(var i=0; i<mapSize; i++){
    for(var j=0; j<mapSize; j++){
      if(simulationRunning && currentFrame%framesPerTurn === 0){
        //Draw Vegetation
        if(map[i][j].vegetation){
          ctx.fillStyle = 'rgb('+map[i][j].vegetation.color+')';
          ctx.fillRect(i*cellSize+cellSize/4, j*cellSize+cellSize/4, cellSize/2, cellSize/2);
        }
      }
      //Redraw map if anything about it changed
      if(mapChanged){
        //Reset all vegetation 
        map[i][j].vegetation = null;
        roundsVegRandomize = 3;
        //Update tile biome based on variant 
        if(map[i][j].elevation <= oceanLevel){
          map[i][j].biome = "Ocean";
        }else{
          var adjElevTemp = map[i][j].temperature-Math.round(((2*maxTempStep*(map[i][j].elevation-oceanLevel))/maxElevation)-maxTempStep);
          if(adjElevTemp<0){
            adjElevTemp = 0;
          }else if(adjElevTemp>maxTemperature){
            adjElevTemp = maxTemperature;
          }
          var tempLevel = Math.floor(Math.floor(((adjElevTemp/maxTemperature)*(highTemp-lowTemp))+lowTemp)*6/maxTemperature);
          var precLevel = Math.floor(((precipitationDensity+map[i][j].precipitation/maxPrecipitation)/2*map[i][j].precipitation)*6/maxPrecipitation);
          if(tempLevel === 6){tempLevel = 5;}
          if(precLevel === 6){precLevel = 5;}
          map[i][j].biome = biomeKey[tempLevel][precLevel];
        }
        map[i][j].soilRichness = biomeStats[map[i][j].biome].soilRichness/8;
      }
      if(viewChanged){
        //Colors for various Views
        ctx.fillStyle = 'rgb('+biomeStats[map[i][j].biome].color+')';
        
        if(currentView === "elevation"){
          if(map[i][j].biome === "Ocean"){
            var elevationColor = Math.floor(255*(map[i][j].elevation/maxElevation));
            var averageR = Math.floor(0.4*parseInt(ctx.fillStyle.substring(1,3), 16) + 0.6*elevationColor);
            var averageG = Math.floor(0.4*parseInt(ctx.fillStyle.substring(3,5), 16) + 0.6*elevationColor);
            var averageB = Math.floor(0.4*parseInt(ctx.fillStyle.substring(5), 16) + 0.6*elevationColor);
            ctx.fillStyle = 'rgb('+averageR+','+averageG+','+averageB+')';
          }else{
            var averageR = Math.floor((((map[i][j].elevation-oceanLevel)/maxElevation)*0.75+0.25)*parseInt(ctx.fillStyle.substring(1,3), 16));
            var averageG = Math.floor((((map[i][j].elevation-oceanLevel)/maxElevation)*0.75+0.25)*parseInt(ctx.fillStyle.substring(3,5), 16));
            var averageB = Math.floor((((map[i][j].elevation-oceanLevel)/maxElevation)*0.75+0.25)*parseInt(ctx.fillStyle.substring(5), 16));
            ctx.fillStyle = 'rgb('+averageR+','+averageG+','+averageB+')';
          }
          
        }
        else if(currentView === "precipitation"){
          var overlayG = Math.floor((1-map[i][j].precipitation/maxPrecipitation)*(parseInt(ctx.fillStyle.substring(3,5), 16)/2) + Math.floor((map[i][j].precipitation/maxPrecipitation)*255));
          var overlayB = Math.floor((1-map[i][j].precipitation/maxPrecipitation)*(parseInt(ctx.fillStyle.substring(5), 16)/2) + Math.floor((map[i][j].precipitation/maxPrecipitation)*255));
          var averageG = Math.floor((1-precipitationDensity)*(parseInt(ctx.fillStyle.substring(3,5), 16)/2) + Math.floor(precipitationDensity*overlayG));
          var averageB = Math.floor((1-precipitationDensity)*(parseInt(ctx.fillStyle.substring(5), 16)/2) + Math.floor(precipitationDensity*overlayB));
          ctx.fillStyle = 'rgb('+Math.floor(parseInt(ctx.fillStyle.substring(1,3), 16)/2)+','+averageG+','+averageB+')';
        }
        else if(currentView === "temperature"){
          var localTemp = Math.floor((map[i][j].temperature/maxTemperature)*(highTemp-lowTemp))+lowTemp;
          if(map[i][j].biome !== "Ocean"){
            var adjElevTemp = map[i][j].temperature-Math.round(((2*maxTempStep*(map[i][j].elevation-oceanLevel))/maxElevation)-maxTempStep);
            if(adjElevTemp<0){
              adjElevTemp = 0;
            }else if(adjElevTemp>maxTemperature){
              adjElevTemp = maxTemperature;
            }
            localTemp = Math.floor((adjElevTemp/maxTemperature)*(highTemp-lowTemp))+lowTemp;
          }
          var halfG = Math.floor(parseInt(ctx.fillStyle.substring(3,5), 16)/2);
          var averageB = Math.floor((1-localTemp/maxTemperature)*parseInt(ctx.fillStyle.substring(5), 16)+Math.floor(255*(1-localTemp/maxTemperature)));
          ctx.fillStyle = 'rgb('+Math.round(255*(localTemp/maxTemperature))+','+halfG+','+averageB+')';
        }
        
        ctx.fillRect(i*cellSize, j*cellSize, cellSize, cellSize);
      }
    }
  }
  viewChanged = false;
  mapChanged = false;
  requestAnimationFrame(update);
}

function createMap(){
  mapChanged = true;
  viewChanged = true;

  //Set elevation seed corners
  map[0][0] = {elevation: Math.floor(Math.random()*maxElevation), precipitation: Math.floor(Math.random()*maxPrecipitation)};
  map[mapSize/2][0] = {elevation: Math.floor(Math.random()*maxElevation), precipitation: Math.floor(Math.random()*maxPrecipitation)};
  map[0][mapSize/2] = {elevation: Math.floor(Math.random()*maxElevation), precipitation: Math.floor(Math.random()*maxPrecipitation)};
  map[mapSize/2][mapSize/2] = {elevation: Math.floor(Math.random()*maxElevation), precipitation: Math.floor(Math.random()*maxPrecipitation)};

  function getMidStat(x1, y1, x2, y2, stat, maxStat, ranStep, maxRandStep){
    var midStat;
    if(ranStep > 0){
      midStat = Math.floor(Math.random()*maxStat);
    }else{
      midStat = Math.floor((map[x1][y1][stat]+map[x2][y2][stat])/2);
      midStat += Math.floor((Math.random()*maxRandStep)-maxRandStep/2);
      if(midStat < 0){midStat = 0;}
      if(midStat > maxStat){midStat = maxStat;}
    }
    return midStat;
  }

  var tempStep = mapSize/2;
  var randomStepElev = numStepsRandomize;
  var randomStepPrec = numStepsRandomize;
  while(tempStep > 1){

    //Find and iterate through all cells
    for(var i=0; i < mapSize; i+=tempStep){
      for(var j=0; j < mapSize; j+=tempStep){
        //Calculate elevations and precipitation susceptibility between nodes
        var rightCell, downCell;
        i+tempStep === mapSize ? rightCell = 0 : rightCell = i+tempStep;
        j+tempStep === mapSize ? downCell = 0 : downCell = j+tempStep;

        map[i][j+tempStep/2] = {elevation: getMidStat(i,j,i,downCell, "elevation", maxElevation, randomStepElev, maxElevRandomize),
                                precipitation: getMidStat(i,j,i,downCell, "precipitation", maxPrecipitation, randomStepPrec, maxPrecRandomize)};
        map[i+tempStep/2][j] = {elevation: getMidStat(i,j,rightCell,j, "elevation", maxElevation, randomStepElev, maxElevRandomize),
                                precipitation: getMidStat(i,j,rightCell,j, "precipitation", maxPrecipitation, randomStepPrec, maxPrecRandomize)};
        map[rightCell][j+tempStep/2] = {elevation: getMidStat(rightCell,j,rightCell,downCell, "elevation", maxElevation, randomStepElev, maxElevRandomize),
                                precipitation: getMidStat(rightCell,j,rightCell,downCell, "precipitation", maxPrecipitation, randomStepPrec, maxPrecRandomize)};
        map[i+tempStep/2][downCell] = {elevation: getMidStat(i,downCell,rightCell,downCell, "elevation", maxElevation, randomStepElev, maxElevRandomize),
                                precipitation: getMidStat(i,downCell,rightCell,downCell, "precipitation", maxPrecipitation, randomStepPrec, maxPrecRandomize)};

        //Calculate center node elevation
        var avgElevation = Math.floor((map[i][j].elevation+map[rightCell][j].elevation+map[i][downCell].elevation+map[rightCell][downCell].elevation)/4);
        avgElevation += Math.floor((Math.random()*maxElevRandomize)-maxElevRandomize/2);
        if(avgElevation < 0){avgElevation = 0;}
        if(avgElevation > maxElevation){avgElevation = maxElevation;}

        //Calculate center node precipitation
        var avgPrecipitation = Math.floor((map[i][j].precipitation+map[rightCell][j].precipitation+map[i][downCell].precipitation+map[rightCell][downCell].precipitation)/4);
        avgPrecipitation += Math.floor((Math.random()*maxPrecRandomize)-maxPrecRandomize/2);
        if(avgPrecipitation < 0){avgPrecipitation = 0;}
        if(avgPrecipitation > maxPrecipitation){avgPrecipitation = maxPrecipitation;}

        map[i+tempStep/2][j+tempStep/2] = {elevation: avgElevation, precipitation: avgPrecipitation};
      }
    }
    //Adjust tempStep
    tempStep /= 2;
    randomStepElev -= 1;
    randomStepPrec -= 1;
  }

  //Set Temperature and Biomes
  for(var i=0; i<mapSize; i++){
    for (var j=0; j<mapSize; j++){
      //Calculate temperature for tile
      var maxDiffTileTemp = Math.max(mapSize-equatorPosition, equatorPosition);
      var tempPerTile = highTemp/maxDiffTileTemp;
      var differenceTemp = Math.floor(tempPerTile*Math.abs(equatorPosition-j));
      map[i][j].temperature = highTemp-differenceTemp;

      //Set Biome
      if(map[i][j].elevation <= oceanLevel){
        map[i][j].biome = "Ocean";
      }else{
        var tempLevel = Math.floor(map[i][j].temperature*6/maxTemperature);
        var precLevel = Math.floor(map[i][j].precipitation*6/maxPrecipitation);
        if(tempLevel === 6){tempLevel = 5;}
        if(precLevel === 6){precLevel = 5;}
        map[i][j].biome = biomeKey[tempLevel][precLevel];
      }
    }
  }
  
  //Create Vegetation Species
  for(var i=0; i<numVegSpecies; i++){
    var vegColor = Math.floor(Math.random()*255)+','+Math.floor(Math.random()*255)+','+Math.floor(Math.random()*255);
    var vegIdealSoil = Math.random();
    var vegFertility = Math.random()/2;
    vegetationSpecies[i] = {name: i, idealSoilRichness: vegIdealSoil, color: vegColor, fertility: vegFertility};
  }
  console.log(vegetationSpecies);
}

function spawnVegetation(randomizeVeg){
  console.log("spawning vegetation");
  for(var i=0; i<mapSize; i++){
    for (var j=0; j<mapSize; j++){
      if(!map[i][j].vegetation && map[i][j].biome !== "Ocean"){
        //Find all contenders for vegetation population of tile and set appropriate proximity bonus
        var seeds = [];
        if(randomizeVeg){
          seeds.push(vegetationSpecies[Math.floor(vegetationSpecies.length*Math.random())].name);
        }else{
          for(var x=0; x<3; x++){
            for (var y=0; y<3; y++){
              var tempX = i+x-1;
              var tempY = j+y-1;
              if(i+x-1 < 0){tempX = mapSize-1;}
              if(i+x-1 === mapSize){tempX = 0;}
              if(j+y-1 < 0){tempY = mapSize-1;}
              if(j+y-1 === mapSize){tempY = 0;}
              if(map[tempX][tempY].vegetation){
                seeds.push(map[tempX][tempY].vegetation.name);
              }
            }
          }
        }
        //Shuffle seed array
        var currentIndex = seeds.length, temporaryValue, randomIndex;
        while (0 !== currentIndex) {
          randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex -= 1;
          temporaryValue = seeds[currentIndex];
          seeds[currentIndex] = seeds[randomIndex];
          seeds[randomIndex] = temporaryValue;
        }
        //Going through seeds array in order, see if seed populates tile
        for(var x=0; x<seeds.length; x++){
          var idealBiomePercentage = 1-Math.abs(vegetationSpecies[seeds[x]].idealSoilRichness-biomeStats[map[i][j].biome].soilRichness)/biomeVegTolerance;
          if(idealBiomePercentage < 0){idealBiomePercentage = 0;}
          var successChance = Math.pow(idealBiomePercentage,2)*vegetationSpecies[seeds[x]].fertility/8;
          if(!map[i][j].vegetation && successChance >= Math.random()){
            map[i][j].vegetation = vegetationSpecies[seeds[x]];
          }
        }
      }
    }
  }
}

//Call update() when document has finished loading to start animation
$(window).load(function(){
	createMap();
	update();
});

$("#new-map").click(function(){
  console.log("Generated New Map");
  createMap();
  update();
});

$("#toggle-sim").click(function(){
  $("#preferences-toolbar").toggle();
  simulationRunning = !simulationRunning;
  simulationRunning ? $(this).text("Stop Simulation") : $(this).text("Start Simulation");
  console.log("Sim Running="+simulationRunning);
  //update();
});

$("#biome-button").click(function(){
  currentView = "biome";
  console.log(currentView);
  viewChanged = true;
  update();
});

$("#elevation-button").click(function(){
  currentView = "elevation";
  console.log(currentView);
  viewChanged = true;
  update();
});

$("#precipitation-button").click(function(){
  currentView = "precipitation";
  console.log(currentView);
  viewChanged = true;
  update();
});

$("#temperature-button").click(function(){
  currentView = "temperature";
  console.log(currentView);
  viewChanged = true;
  update();
});

$( "#ocean-slider" ).slider({
  min: 0,
  max: maxElevation,
  value: oceanLevel,
  range: "min",
  slide: function( event, ui ) {
          oceanLevel = ui.value;
          mapChanged = true;
          viewChanged = true;
         }});

$( "#temp-slider" ).slider({
  min: 0,
  max: maxTemperature,
  values: [lowTemp, highTemp],
  range: true,
  slide: function( event, ui ) {
          lowTemp = ui.values[0];
          highTemp = ui.values[1];
          mapChanged = true;
          viewChanged = true;
         }});

$( "#precipitation-slider" ).slider({
  min: 0,
  max: maxPrecipitation,
  value: 50,
  range: "min",
  slide: function( event, ui ) {
          precipitationDensity = ui.value/100;
          mapChanged = true;
          viewChanged = true;
         }});

$("#canvas").mousemove(function(event){
  var calcSize = $(this).width()/mapSize;
  var tileX = Math.floor((event.pageX-this.offsetLeft)/calcSize);
  if(tileX === mapSize){tileX = mapSize-1};
  var tileY = Math.floor((event.pageY-this.offsetTop)/calcSize);
  if(tileY === mapSize){tileY = mapSize-1};
  $("#tile-details").text("Tile ("+tileX+","+tileY+") Biome: "+map[tileX][tileY].biome);
});