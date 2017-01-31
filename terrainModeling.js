//-------------------------------------------------------------------------
// vertex position and set new normals
function terrainFromIteration(n, min_x,max_x,min_y,max_y, vertexArray, faceArray,N_ARRAY,heightArray)
{
    var deltaX=(max_x-min_x)/n;
    var deltaY=(max_y-min_y)/n;
    for(var i=0;i<=n;i++)
       for(var j=0;j<=n;j++)
       {
           vertexArray.push(min_x+deltaX*j);
           vertexArray.push(min_y+deltaY*i);
           vertexArray.push(heightArray[j][i]);
            var hi = i*(n+1) + j;
           N_ARRAY.push(hi);
           N_ARRAY.push(hi+n+1);
           N_ARRAY.push(hi+1);
       }
    var numT=0;
    for(var i=0;i<n;i++)
       for(var j=0;j<n;j++)
       {
           var vid = i*(n+1) + j;
           faceArray.push(vid);
           faceArray.push(vid+1);
           faceArray.push(vid+n+1);
           
           faceArray.push(vid+1);
           faceArray.push(vid+1+n+1);
           faceArray.push(vid+n+1);
           numT+=2;
       }
    return numT;
}

//getheight
//purpose: generate height for the middle point using diamond square algorithm  
//input: heightArray that stores height for each points, min_x, min_y, max_x, max_y, n
//output: none
function getHeight(heightArray, min_x, min_y,  max_x, max_y, n){

    var h1 = heightArray[min_x][min_y]; var h2 = heightArray[min_x][max_y]; 
    var h3 = heightArray[max_x][min_y]; var h4 = heightArray[max_x][max_y];
    n = Math.floor(n/2);
    var middleX = min_x+n; var middleY = min_y+n;
    heightArray[middleX][middleY] = (h1+h2+h3+h4)/4 + Math.random()*0.1;
    setsquareheight(heightArray, min_x , min_y, max_x, max_y, middleX,middleY, n);
}
// 
function setsquareheight(heightArray, min_x, min_y, max_x, max_y, middleX, middleY, n){
    if(n>0){
       var h1 = heightArray[min_x][min_y]; var h2 = heightArray[min_x][max_y];
       var h3 = heightArray[max_x][min_y]; var h4 = heightArray[max_x][max_y];
       var h5 = heightArray[middleX][middleY];
        heightArray[min_x][middleY] = (h1+h2 +h5)/3 + Math.random()*0.2;
        heightArray[max_x][middleY] = (h3+h5 + h4)/3 +Math.random()*0.2;
        heightArray[middleX][min_y] = (h1+h3+h5)/3+3*Math.random()*0.2;
        heightArray[middleX][max_y] = (h4+ h2+h5)/3+Math.random()*0.2;
        
        getHeight(heightArray, min_x, min_y, middleX, middleY, n);
        getHeight(heightArray, middleX, min_y, max_x, middleY, n);
        getHeight(heightArray, min_x, middleY, middleX, max_y, n);
        getHeight(heightArray, middleX, middleY, max_x, max_y, n);
    }
}
//-------------------------------------------------------------------------
function generateLinesFromIndexedTriangles(faceArray,lineArray)
{
    numTris=faceArray.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3
        lineArray.push(faceArray[fid]);
        lineArray.push(faceArray[fid+1]);
        
        lineArray.push(faceArray[fid+1]);
        lineArray.push(faceArray[fid+2]);
        
        lineArray.push(faceArray[fid+2]);
        lineArray.push(faceArray[fid]);
    }
}

//-------------------------------------------------------------------------
// change the keyboard structure when certain key got pressed down
document.onkeydown = function (e){
  if (e.keyCode === 37) {
    //move left
    keyboard.left = true;
    keyboard.right = false;
    console.log("it moved left")
  } else if (e.keyCode === 38) {
    //move up
    keyboard.up = true;
    keyboard.down = false;
    console.log("it moved up");
  } else if (e.keyCode === 39) {
    //move right
    keyboard.left = false;
    keyboard.right = true;
    console.log("it moved right");
  } else if (e.keyCode === 40) {
    //move down
    keyboard.up = false;
    keyboard.down = true;
    console.log("it moved down");
  } else if (e.keyCode === 65){
    //turn to the left
      keyboard.turnleft = true;
      keyboard.turnright = false;
      console.log("it turn to the left");
  } else if(e.keyCode === 68){
      // turn to the right
      keyboard.turnleft = false;
      keyboard.turnright = true;
      console.log("it turn to the right");
  } else if(e.keyCode === 83){
      // speed up
      speed.speedup = true;
  } else if(e.keyCode === 88){
      // speed down
      speed.speeddown = true;
  }
}

// reset keyboard structure when releasing keys
document.onkeyup = function (e){
  if (e.keyCode === 37) {
        //move left
        keyboard.left = false;
  } else if (e.keyCode === 38) {
        //move up
        keyboard.up = false;
  } else if (e.keyCode === 39) {
        //move right
        keyboard.right = false;
  } else if (e.keyCode === 40) {
        //move down
        keyboard.down = false;
  } else if(e.keyCode === 65){
        //turn to the left
        keyboard.turnleft = false;
  } else if(e.keyCode === 68){
        //turn to the right
        keyboard.turnright = false;
  } else if(e.keyCode === 83){
        //speed up
        speed.speedup = false;
  } else if(e.keyCode === 88){
        //speed down
        speed.speeddown = false;
  }

  if ((e.keyCode >= 37 && e.keyCode <= 40) || e.keyCode===65 || e.keyCode===68 || e.keyCode=== 83 || e.keyCode=== 88) {
    rot = quat.create([0.0, 0.5, 0.0, 0.0]);
  }
} 