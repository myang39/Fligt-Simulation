var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;

//store terrain geometry
var tVertexPositionBuffer;

//store normals for shading
var tVertexNormalBuffer;

//store the terrain triangles
var tIndexTriBuffer;

//store the traingle edges
var tIndexEdgeBuffer;

//parameters
var eyePt = vec3.fromValues(0.0,0.0,0.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);

//new Create the normal
var nMatrix = mat3.create();

//new ModelView matrix
var mvMatrix = mat4.create();

//new Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];

var rot = quat.create([0.0, 0.0, 0.0, 1.0]);

var lastCamera = vec3.create();
lastCamera.set([0.0, 0.0, 3]);;

var HelloTerrain = {
  coverEl: document.getElementById('cover'),
  contentEl: document.getElementById('content'),
  fullscreen: false,
  rows: 200,
  cols: 200,
}


var keyboard = {
  left: false,
  right: false,
  up: false,
  down: false,
  turnleft: false,
  turnright: false
}

var speed = {
    velocity: 0.01,
    speedup: false,
    speeddown: false,
}

//-------------------------------------------------------------------------
function setupTerrainBuffers() {
   
    var vTerrain=[];
    var fTerrain=[];
    var nTerrain=[];
    var eTerrain=[];
    var N=129;
    var max = 128;
    var heightArray = new Array(N);
    for(var i =0 ; i< N; i++){
        heightArray[i]= new Array(N);
    }
    heightArray[0][0] = 0;
    heightArray[max][0] = 0;
    heightArray[0][max] = 0;
    heightArray[max][max]=0;
   
    getHeight(heightArray, 0,0,max,max,max);
   
    var numT = terrainFromIteration(N-1, -10,10,-10,10, vTerrain, fTerrain, nTerrain,heightArray);
    console.log("Generated ", numT, " triangles");
    
    tVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vTerrain), gl.STATIC_DRAW);
    tVertexPositionBuffer.itemSize = 3;
    tVertexPositionBuffer.numItems = (N+1)*(N+1);
   
    //lighting calculations
    tVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nTerrain),
                  gl.STATIC_DRAW);
    tVertexNormalBuffer.itemSize = 3;
    tVertexNormalBuffer.numItems = (N+1)*(N+1);
   
    //faces of the terrain
    tIndexTriBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fTerrain),
                  gl.STATIC_DRAW);
    tIndexTriBuffer.itemSize = 1;
    tIndexTriBuffer.numItems = numT*3;
   
    //Setup Edges
     generateLinesFromIndexedTriangles(fTerrain,eTerrain);  
     tIndexEdgeBuffer = gl.createBuffer();
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(eTerrain),
                  gl.STATIC_DRAW);
     tIndexEdgeBuffer.itemSize = 1;
     tIndexEdgeBuffer.numItems = eTerrain.length;
   
     
}
function initWebGL(canvas) {
  try {
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    if (gl){
      //shaders and buffers.
      initShaders();
      initBuffers();

      //depth testing.
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);

      // Fetch matrix uniforms.
      getMatrixUniforms();

      //viewport and perspective.
      gl.viewport(0, 0, canvas.width, canvas.height);
      mat4.perspective(45, canvas.width/canvas.height, 0.1, 100, pMatrix);
    }
  }
  catch (e){}
  if (!gl) alert(
      "Unable to initialize WebGL. Your browser may not support it.");
  return gl;
}
//-------------------------------------------------------------------------
function drawTerrain(){
 gl.polygonOffset(0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);  
   
 //set triangles
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
 gl.drawElements(gl.TRIANGLES, tIndexTriBuffer.numItems, gl.UNSIGNED_SHORT,0);      
}

//-------------------------------------------------------------------------
function drawTerrainEdges(){
 gl.polygonOffset(1,1);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

 // Bind shader
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);  
   
 //Draw
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
 gl.drawElements(gl.LINES, tIndexEdgeBuffer.numItems, gl.UNSIGNED_SHORT,0);      
}

//-------------------------------------------------------------------------
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform,
                      false, pMatrix);
}

//-------------------------------------------------------------------------
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
 
  if (!shaderScript) {
    return null;
  }
 
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { 
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

//----------------------------------------------------------------------------------
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
 
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
    
  
}


//-------------------------------------------------------------------------
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
function setupBuffers() {
    setupTerrainBuffers();
}
// draw everything
//----------------------------------------------------------------------------------
function draw() {
    var transformVec = vec3.create();
 
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    //look down at -z   
    vec3.add(viewPt, eyePt, viewDir);
    //lookat matrix
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);    
 
    //Terrain
    mvPushMatrix();
    //set the beginning point in the terrain
    vec3.set(transformVec,0.1,-0.35,-17.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75));
    mat4.rotateZ(mvMatrix, mvMatrix, degToRad(25));    
    setMatrixUniforms();
    
    //color
    var Ia = vec3.fromValues(1.0,1.0,0.0);
    var Id = vec3.fromValues(1.0,1.0,0.0);
    var Is = vec3.fromValues(1.0,1.0,0.0);
    
    var lightPosEye4 = vec4.fromValues(20.0,20.0,0.0,1.0);
    lightPosEye4 = vec4.transformMat4(lightPosEye4,lightPosEye4,mvMatrix);
    var lightPosEye = vec3.fromValues(lightPosEye4[0],lightPosEye4[1],lightPosEye4[2]);
    
    //material  
    var transformVec = vec3.create();
    var ka = vec3.fromValues(0.0,0.0,0.0);
    var kd = vec3.fromValues(0.6,0.6,0.0);
    var ks = vec3.fromValues(0.4,0.4,0.0);
    mvPushMatrix();
    vec3.set(transformVec,10,10,10);
    mat4.scale(mvMatrix, mvMatrix,transformVec);
    
    if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked))
    {
      uploadLightsToShader([1,1,2],[0.2,0.4,0.4],[0.0,0.2,0.4],[0.0,0.0,1.0]);
      drawTerrain();
    }
   
    if(document.getElementById("wirepoly").checked){
      uploadLightsToShader([0,1,1],[0.0,0.0,0.0],[0.0,0.0,0.0],[0.0,0.0,0.0]);
      drawTerrainEdges();
    }
    
    if(document.getElementById("wireframe").checked){
      uploadLightsToShader([0,1,1],[1.0,1.0,1.0],[0.0,0.0,0.0],[0.0,0.0,0.0]);
      drawTerrainEdges();
    }
    
    mvPopMatrix();
 
}

function pitch(degree) {
  //convert the degree to radian
  var rad = degToRad(degree);
  //a working quaternion object
  var workingQuat = quat.create();
  var vecTemp = vec3.create();
  vec3.cross(vecTemp, viewDir, up);

  //yaw rotation
  quat.setAxisAngle(workingQuat, vecTemp, rad);
 
  //normalize
  quat.normalize(workingQuat, workingQuat);
  quat.multiply(rot, rot, workingQuat);

  //normalize
  quat.normalize(rot, rot);

  //view matrix
  vec3.transformQuat(up, up, rot);
  vec3.transformQuat(viewDir, viewDir, rot);
}

function roll(degree) {
  //convert the degree
  var rad = degToRad(degree);
  //a working quaternion object
  var workingQuat = quat.create();
  //yaw rotation
  quat.setAxisAngle(workingQuat, viewDir, rad);

  //rotation
  quat.normalize(workingQuat, workingQuat);
  quat.multiply(rot, rot, workingQuat);

  //normalize quaternion
  quat.normalize(rot, rot);

  //view matrix
  vec3.transformQuat(up, up, rot);
  vec3.transformQuat(viewDir, viewDir, rot);
}

function turn(degree) {
  //convert the degree to radian
  var rad = degToRad(degree);
  //create a working quaternion object
  var workingQuat = quat.create();
  //yaw rotation
  quat.setAxisAngle(workingQuat, up, rad);

  //normalize
  quat.normalize(workingQuat, workingQuat);
  quat.multiply(rot, rot, workingQuat);

  //normalize
  quat.normalize(rot, rot);

  //view matrix
  vec3.transformQuat(up, up, rot);
  vec3.transformQuat(viewDir, viewDir, rot);
}
//----------------------------------------------------------------------------------
function animate() {
   //current direction.
  vec3.normalize(viewDir, viewDir);
 
  vec3.scale(viewDir, viewDir, speed.velocity);

  // Save position.
  lastCamera.set(eyePt);

  // Normalize.
  vec3.normalize(up, up);

  //rotation transformations.
  if (keyboard.left){
    // Calculate the change after the left key is pressed
    roll(-3);
  }

  else if (keyboard.right){
    roll(3);
  }
  if (keyboard.turnleft){

    turn(0.15);
  }

  else if (keyboard.turnright){
    turn(-0.15);
  }

  if (keyboard.up){
    pitch(3);
  }

  else if (keyboard.down){ 
    pitch(-3);
  }
  
  if(speed.speedup){
      speed.velocity = 0.03;
  }
  else if (speed.speeddown){ 
      speed.velocity = 0.003;
  }
  vec3.add(eyePt, eyePt, viewDir);
}

//----------------------------------------------------------------------------------
function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(0.9, 1.0, 0.9, 1.0);
  gl.enable(gl.DEPTH_TEST);
  tick();
}

//----------------------------------------------------------------------------------
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}