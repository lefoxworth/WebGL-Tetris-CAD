//Tetris CAD program
//CS435 Project 2
//Created by Laura Foxworth
//Based on the Tangram.js code

"use strict"

var canvas;
var gl;

var projection; // projection matrix uniform shader variable location
var transformation; // projection matrix uniform shader variable location
var vPosition;
var vColor;

// state representation
var Blocks; // seven blocks
var Tetraminos;
var BlockIdToBeMoved; // this black is moving
var MinoIdToBeMoved;
var MoveCount;
var OldX;
var OldY;

var rotIndex = 1; // default
var rotDegrees = [ 1, 5, 10, 30, 45, 90];

function Tetramino (move, x, y, b1, b2, b3, b4) {
  this.blocks = [];
  this.blocks.push(b1);
  this.blocks.push(b2);
  this.blocks.push(b3);
  this.blocks.push(b4);

  this.color = this.blocks[0].color;

  this.canMove = move;

  this.originX = x;
  this.originY = y;

  this.isInside = function(x, y) {
    var inside = false;
    for(var i = 0; i < 4; i++) {
      if (this.blocks[i].isInside(x, y) == true) {
        inside = true;
      }
    }
    return inside;
  }

  this.changeColor = function(color) {
    for(var i = 0; i < 4; i++) {
      this.blocks[i].changeColor(color);
    }
    return;
  }

  this.UpdateOffset = function(dx, dy) {
    for(var i = 0; i < 4; i++) {
      this.blocks[i].UpdateOffset(dx, dy);
    }
    this.originX += dx;
    this.originY += dy;
    return;
  }

  this.Duplicate = function() {
    for(var i = 0; i < 4; i++) {
      Blocks.push(new CPiece(vec2(this.blocks[i].pivot), 4, this.color,
        this.blocks[i].points[0][0], this.blocks[i].points[0][1],
        this.blocks[i].points[1][0], this.blocks[i].points[1][1],
        this.blocks[i].points[2][0], this.blocks[i].points[2][1],
        this.blocks[i].points[3][0], this.blocks[i].points[3][1]));
      Blocks[Blocks.length-1].init();
    }
    Tetraminos.push(new Tetramino(true, this.originX, this.originY,
      Blocks[Blocks.length-1],
      Blocks[Blocks.length-2],
      Blocks[Blocks.length-3],
      Blocks[Blocks.length-4]));
  }

  this.checkDelete = function() {
    var temp = false;
    for(var i = 0; i < 4; i++) {
      for(var j = 0; j < 4; j++) {
        if(this.blocks[i].points[j][1] + this.blocks[i].OffsetY <= 100) {
          temp = true;
        }
      }
    }
    return temp;
  }

  this.Delete = function() {
    for(var i = 0; i < 4; i++) {
      this.blocks[i].drawBit = false;
    }
  }

  this.UpdateAngle = function(angle) {
    for(var i = 0; i < 4; i++) {
      this.blocks[i].UpdateAngle(angle);
    }
  }
}

function CPiece (pivot, n, color, x0, y0, x1, y1, x2, y2, x3, y3) {
    this.NumVertices = n;
    this.color = color;
    this.points=[];
    this.points.push(vec2(x0, y0));
    this.points.push(vec2(x1, y1));
    this.points.push(vec2(x2, y2));
    this.points.push(vec2(x3, y3));
    this.colors=[];
    for (var i=0; i<this.NumVertices; i++) this.colors.push(color);

    this.vBuffer=0;
    this.cBuffer=0;

    this.OffsetX=0;
    this.OffsetY=0;
    this.Angle=0;

    this.drawBit = true;

    this.pivot = pivot;

    this.changeColor = function(color) {
      for(var i=0; i < this.NumVertices; i++) {
        this.colors[i] = color;

        gl.bindBuffer( gl.ARRAY_BUFFER, this.cBuffer );

        gl.bufferData( gl.ARRAY_BUFFER, flatten(this.colors), gl.STATIC_DRAW );
      }
    }

    this.UpdateOffset = function(dx, dy) {
        this.OffsetX += dx;
        this.OffsetY += dy;
    }

    this.SetOffset = function(dx, dy) {
        this.OffsetX = dx;
        this.OffsetY = dy;
    }

    this.UpdateAngle = function(deg) {
        this.Angle += deg;
    }

    this.SetAngle = function(deg) {
        this.Angle = deg;
    }

    this.isLeft = function(x, y, id) {	// Is Point (x, y) located to the left when walking from id to id+1?
        var id1=(id+1)%this.NumVertices;
        return (y-this.points[id][1])*(this.points[id1][0]-this.points[id][0])>(x-this.points[id][0])*(this.points[id1][1]-this.points[id][1]);
    }

    this.transform = function(x, y) {
        var theta = -Math.PI/180*this.Angle;	// in radians
        var x2 = this.points[0][0] + (x - this.points[0][0]-this.OffsetX) * Math.cos(theta) - (y - this.points[0][1]-this.OffsetY) * Math.sin(theta);
        var y2 = this.points[0][1] + (x - this.points[0][0]-this.OffsetX) * Math.sin(theta) + (y - this.points[0][1]-this.OffsetY) * Math.cos(theta);
        return vec2(x2, y2);
    }

    this.isInside = function(x, y) {
        var p=this.transform(x, y);
        for (var i=0; i<this.NumVertices; i++) {
            if (!this.isLeft(p[0], p[1], i)) return false;
        }
        return true;
    }

    this.init = function() {

        this.vBuffer = gl.createBuffer();

        gl.bindBuffer( gl.ARRAY_BUFFER, this.vBuffer );

        gl.bufferData( gl.ARRAY_BUFFER, flatten(this.points), gl.STATIC_DRAW );

        this.cBuffer = gl.createBuffer();

        gl.bindBuffer( gl.ARRAY_BUFFER, this.cBuffer );

        gl.bufferData( gl.ARRAY_BUFFER, flatten(this.colors), gl.STATIC_DRAW );

    }

    this.draw = function() {
//        var tm=translate(this.points[0][0]+this.OffsetX, this.points[0][1]+this.OffsetY, 0.0);
        var tm=translate(this.pivot[0] + this.OffsetX, this.pivot[1] + this.OffsetY, 0.0);
        tm=mult(tm, rotate(this.Angle, vec3(0, 0, 1)));
//        tm=mult(tm, translate(-this.points[0][0], -this.points[0][1], 0.0));
        tm=mult(tm, translate(-this.pivot[0], -this.pivot[1], 0.0));
        gl.uniformMatrix4fv( transformation, gl.TRUE, flatten(tm) );

        gl.bindBuffer( gl.ARRAY_BUFFER, this.vBuffer );
        gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( vPosition );


        gl.bindBuffer( gl.ARRAY_BUFFER, this.cBuffer );
        gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( vColor );

        if (this.NumVertices==3) {
            gl.drawArrays( gl.TRIANGLES, 0, this.NumVertices );
        }
        else {
            gl.drawArrays( gl.TRIANGLE_FAN, 0, this.NumVertices );
        }
    }

}

window.onload = function initialize() {
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

//    var m = document.getElementById("mymenu");
//    m.selectedIndex=rotIndex;
//    m.addEventListener("click", function() {
//       rotIndex = m.selectedIndex;
//    });

//    var a = document.getElementById("mybutton")
//    a.addEventListener("click", function(){
//      for (var i=0; i<7; i++) {
//        Blocks[i].SetAngle(0);
//        Blocks[i].SetOffset(0, 0);
//        window.requestAnimFrame(render);
//        // render();
//      }
//    });

/* This does not work. click here is different from the traditional click
  canvas.addEventListener("click", function(event){
    var x = event.pageX - canvas.offsetLeft;
    var y = event.pageY - canvas.offsetTop;
    y=canvas.height-y;
    console.log("clicked, x="+x+", y="+y);

    for (var i=6; i>=0; i--) {	// search from last to first
      if (Blocks[i].isInside(x, y)) {
        // move Blocks[i] to the top
        var temp=Blocks[i];
        for (var j=i; j<6; j++) Blocks[j]=Blocks[j+1];
        Blocks[6]=temp;
        // rotate the block
        Blocks[6].UpdateAngle(rotDegrees[rotIndex]);
        // redraw
        render();
        break;
      }
    }
  });
*/
  canvas.addEventListener("mousedown", function(event){
    if (event.button!=0) return; // left button only
    var x = event.pageX - canvas.offsetLeft;
    var y = event.pageY - canvas.offsetTop;
    y=canvas.height-y;
    // console.log("mousedown, x="+x+", y="+y);
    if (event.shiftKey) {  // with shift key, rotate counter-clockwise
      for( var i = Tetraminos.length-1; i >= 0; i--) {
        if(Tetraminos[i].isInside(x, y)) {
          if(Tetraminos[i].canMove == true) {
            var temp = Tetraminos[i];
            for(var j = i; j < Tetraminos.length-1; j++) Tetraminos[j] = Tetraminos[j + 1];
            Tetraminos[Tetraminos.length-1] = temp;
            Tetraminos[Tetraminos.length-1].UpdateAngle(90);
            window.requestAnimFrame(render);
            return;
          }
        }
      }
      return;
//      for (var i=6; i>=0; i--) {	// search from last to first
//        if (Blocks[i].isInside(x, y)) {
//          // move Blocks[i] to the top
//          var temp=Blocks[i];
//          for (var j=i; j<6; j++) Blocks[j]=Blocks[j+1];
//          Blocks[6]=temp;
//          // rotate the block
//          Blocks[6].UpdateAngle(rotDegrees[rotIndex]);
//          // redraw
//          // render();
//          window.requestAnimFrame(render);
//          return;
//        }
//      }
//      return;
    }
    if (event.altKey) {
      for(var i = Tetraminos.length-1; i >= 0; i--) {
        if (Tetraminos[i].isInside(x, y) == true) {
          Tetraminos[i].changeColor(vec4(1.0, 1.0, 1.0, 1.0));
        }
      }
    }
//    if (event.altKey) { // with alternate key, rotate clockwise
//      for(var i = Tetraminos.length-1; i >= 0; i--) {
//        if (Tetraminos[i].isInside(x, y) == true) {
//          var temp = Tetraminos[i];
//          for(var j = i; j < Tetraminos.length-1; j++) Tetraminos[j] = Tetraminos[j + 1];
//          Tetraminos[Tetraminos.length-1] = temp;
//          Tetraminos[Tetraminos.length-1].UpdateAngle(-90);
//          window.requestAnimFrame(render);
//          return;
//        }
//      }
//      for (var i=6; i>=0; i--) {	// search from last to first
//        if (Blocks[i].isInside(x, y)) {
//          // move Blocks[i] to the top
//          var temp=Blocks[i];
//          for (var j=i; j<6; j++) Blocks[j]=Blocks[j+1];
//          Blocks[6]=temp;
//          // rotate the block
//          Blocks[6].UpdateAngle(-rotDegrees[rotIndex]);
//          // redraw
//          window.requestAnimFrame(render);
//          // render();
//          return;
//        }
//      }
//      return;
//    }
    for (var i=Tetraminos.length-1; i>=0; i--) {	// search from last to first
      if(Tetraminos[i].isInside(x, y)) {
        var temp = Tetraminos[i];
        for (var j = i; j < Tetraminos.length-1; j++) Tetraminos[j] = Tetraminos[j+1];
        Tetraminos[Tetraminos.length-1] = temp;
        MinoIdToBeMoved = Tetraminos.length-1;
        MoveCount=0;
        OldX=x;
        OldY=y;
        window.requestAnimFrame(render);
        break;
      }
//      if (Blocks[i].isInside(x, y)) {
//        // move Blocks[i] to the top
//        var temp=Blocks[i];
//        for (var j=i; j<Blocks.length-1; j++) Blocks[j]=Blocks[j+1];
//        Blocks[Blocks.length-1]=temp;
//        // remember the one to be moved
//        BlockIdToBeMoved=Blocks.length-1;
//        MoveCount=0;
//        OldX=x;
//        OldY=y;
//        // redraw
//        window.requestAnimFrame(render);
//        // render();
//        break;
//      }
    }
  });

  canvas.addEventListener("mouseup", function(event){
    if (MinoIdToBeMoved >= 0) {
//    if (BlockIdToBeMoved>=0) {
/*
      var x = event.pageX - canvas.offsetLeft;
      var y = event.pageY - canvas.offsetTop;
      y=canvas.height-y;
      console.log("mouseup, x="+x+", y="+y);
*/
      var temp = MinoIdToBeMoved;
      MinoIdToBeMoved = -1;
      if (Tetraminos[temp].checkDelete() == true) {
        Tetraminos[temp].Delete();
      }
//      BlockIdToBeMoved=-1;
      window.requestAnimFrame(render);
    }
  });

  canvas.addEventListener("mousemove", function(event){
    if (MinoIdToBeMoved >= 0) {
      if(Tetraminos[MinoIdToBeMoved].canMove == false) {
        Tetraminos[MinoIdToBeMoved].Duplicate();
        MinoIdToBeMoved = Tetraminos.length-1;
      }
      var x = event.pageX - canvas.offsetLeft;
      var y = event.pageY - canvas.offsetTop;
      y = canvas.height-y;
      Tetraminos[MinoIdToBeMoved].UpdateOffset(x-OldX, y-OldY);
      MoveCount++;
      OldX = x;
      OldY = y;
      window.requestAnimFrame(render);
    }
//    if (BlockIdToBeMoved>=0) {  // if dragging
//      var x = event.pageX - canvas.offsetLeft;
//      var y = event.pageY - canvas.offsetTop;
//      y=canvas.height-y;
//      Blocks[BlockIdToBeMoved].UpdateOffset(x-OldX, y-OldY);
//      MoveCount++;
//      OldX=x;
//      OldY=y;
//      window.requestAnimFrame(render);
      // render();
//    }
  });

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.7, 0.7, 0.7, 1.0 );

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );



    // Initial State
    Blocks=[];
    Tetraminos = [];

    var deleteZone = new CPiece(vec2(0, 0), 4, vec4(.8, .5, .5, 1.0), 0, 100, 0, 0, 800, 0, 800, 100);
    Blocks.push(deleteZone);

    var createZone = new CPiece(vec2(0, 0), 4, vec4(.7, 1.0, .7, 1.0), 0, 600, 0, 500, 1000, 500, 1000, 1000, 600);
    Blocks.push(createZone);

    //O Piece Blocks
    Blocks.push(new CPiece(vec2(425, 375), 4, vec4(1.0, 1.0, 0.0, 1.0), 25, 575, 25, 550, 50, 550, 50, 575));
    Blocks.push(new CPiece(vec2(425, 375), 4, vec4(1.0, 1.0, 0.0, 1.0), 25, 550, 25, 525, 50, 525, 50, 550));
    Blocks.push(new CPiece(vec2(425, 375), 4, vec4(1.0, 1.0, 0.0, 1.0), 50, 575, 50, 550, 75, 550, 75, 575));
    Blocks.push(new CPiece(vec2(425, 375), 4, vec4(1.0, 1.0, 0.0, 1.0), 50, 550, 50, 525, 75, 525, 75, 550));

    Tetraminos.push(new Tetramino(false, 100, 500, Blocks[2], Blocks[3], Blocks[4], Blocks[5]));

    //Line Piece Blocks
    Blocks.push(new CPiece(vec2(150, 562), 4, vec4(0.0, 0.9, 1.0, 1.0), 100, 575, 100, 550, 125, 550, 125, 575));
    Blocks.push(new CPiece(vec2(150, 562), 4, vec4(0.0, 0.9, 1.0, 1.0), 125, 575, 125, 550, 150, 550, 150, 575));
    Blocks.push(new CPiece(vec2(150, 562), 4, vec4(0.0, 0.9, 1.0, 1.0), 150, 575, 150, 550, 175, 550, 175, 575));
    Blocks.push(new CPiece(vec2(150, 562), 4, vec4(0.0, 0.9, 1.0, 1.0), 175, 575, 175, 550, 200, 550, 200, 575));

    Tetraminos.push(new Tetramino(false, 100, 500, Blocks[6], Blocks[7], Blocks[8], Blocks[9]));

    //T Piece Blocks
    Blocks.push(new CPiece(vec2(262, 537), 4, vec4(1.0, 0.5, 1.0, 1.0), 225, 550, 225, 525, 250, 525, 250, 550));
    Blocks.push(new CPiece(vec2(262, 537), 4, vec4(1.0, 0.5, 1.0, 1.0), 250, 550, 250, 525, 275, 525, 275, 550));
    Blocks.push(new CPiece(vec2(262, 537), 4, vec4(1.0, 0.5, 1.0, 1.0), 250, 575, 250, 550, 275, 550, 275, 575));
    Blocks.push(new CPiece(vec2(262, 537), 4, vec4(1.0, 0.5, 1.0, 1.0), 275, 550, 275, 525, 300, 525, 300, 550));

    Tetraminos.push(new Tetramino(false, 100, 500, Blocks[10], Blocks[11], Blocks[12], Blocks[13]));

    //L Piece Blocks
    Blocks.push(new CPiece(vec2(362, 537), 4, vec4(1.0, 0.5, 0.0, 1.0), 325, 550, 325, 525, 350, 525, 350, 550));
    Blocks.push(new CPiece(vec2(362, 537), 4, vec4(1.0, 0.5, 0.0, 1.0), 350, 550, 350, 525, 375, 525, 375, 550));
    Blocks.push(new CPiece(vec2(362, 537), 4, vec4(1.0, 0.5, 0.0, 1.0), 375, 575, 375, 550, 400, 550, 400, 575));
    Blocks.push(new CPiece(vec2(362, 537), 4, vec4(1.0, 0.5, 0.0, 1.0), 375, 550, 375, 525, 400, 525, 400, 550));

    Tetraminos.push(new Tetramino(false, 100, 500, Blocks[14], Blocks[15], Blocks[16], Blocks[17]));

    //J Piece Blocks
    Blocks.push(new CPiece(vec2(462, 537), 4, vec4(0.0, 0.5, 1.0, 1.0), 425, 550, 425, 525, 450, 525, 450, 550));
    Blocks.push(new CPiece(vec2(462, 537), 4, vec4(0.0, 0.5, 1.0, 1.0), 450, 550, 450, 525, 475, 525, 475, 550));
    Blocks.push(new CPiece(vec2(462, 537), 4, vec4(0.0, 0.5, 1.0, 1.0), 425, 575, 425, 550, 450, 550, 450, 575));
    Blocks.push(new CPiece(vec2(462, 537), 4, vec4(0.0, 0.5, 1.0, 1.0), 475, 550, 475, 525, 500, 525, 500, 550));

    Tetraminos.push(new Tetramino(false, 100, 500, Blocks[18], Blocks[19], Blocks[20], Blocks[21]));

    //S Piece Blocks
    Blocks.push(new CPiece(vec2(562, 550), 4, vec4(0.0, 1.0, 0.0, 1.0), 525, 550, 525, 525, 550, 525, 550, 550));
    Blocks.push(new CPiece(vec2(562, 550), 4, vec4(0.0, 1.0, 0.0, 1.0), 550, 550, 550, 525, 575, 525, 575, 550));
    Blocks.push(new CPiece(vec2(562, 550), 4, vec4(0.0, 1.0, 0.0, 1.0), 550, 575, 550, 550, 575, 550, 575, 575));
    Blocks.push(new CPiece(vec2(562, 550), 4, vec4(0.0, 1.0, 0.0, 1.0), 575, 575, 575, 550, 600, 550, 600, 575));

    Tetraminos.push(new Tetramino(false, 100, 500, Blocks[22], Blocks[23], Blocks[24], Blocks[25]));

    //Z Piece Blocks
    Blocks.push(new CPiece(vec2(662, 550), 4, vec4(1.0, 0.0, 0.0, 1.0), 625, 575, 625, 550, 650, 550, 650, 575));
    Blocks.push(new CPiece(vec2(662, 550), 4, vec4(1.0, 0.0, 0.0, 1.0), 650, 550, 650, 525, 675, 525, 675, 550));
    Blocks.push(new CPiece(vec2(662, 550), 4, vec4(1.0, 0.0, 0.0, 1.0), 650, 575, 650, 550, 675, 550, 675, 575));
    Blocks.push(new CPiece(vec2(662, 550), 4, vec4(1.0, 0.0, 0.0, 1.0), 675, 550, 675, 525, 700, 525, 700, 550));

    Tetraminos.push(new Tetramino(false, 100, 500, Blocks[26], Blocks[27], Blocks[28], Blocks[29]));

//    Blocks.push(new CPiece(3, vec4(1.0, 0.0, 0.0, 1.0), 400, 300, 300, 400, 400, 200, 0, 0));
//    Blocks.push(new CPiece(3, vec4(0.0, 1.0, 0.0, 1.0), 400, 300, 300, 200, 500, 200, 0, 0));
//    Blocks.push(new CPiece(3, vec4(0.0, 0.0, 1.0, 1.0), 500, 400, 400, 400, 500, 300, 0, 0));
//    Blocks.push(new CPiece(3, vec4(1.0, 1.0, 0.0, 1.0), 400, 300, 450, 350, 350, 350, 0, 0));
//    Blocks.push(new CPiece(3, vec4(1.0, 0.0, 1.0, 1.0), 450, 250, 500, 200, 500, 300, 0, 0));
//    Blocks.push(new CPiece(4, vec4(0.0, 1.0, 1.0, 1.0), 400, 300, 400, 200, 500, 200, 500, 300));
//    Blocks.push(new CPiece(4, vec4(0.0, 0.0, 0.0, 1.0), 300, 400, 350, 350, 450, 350, 400, 400));

    for (var i=0; i<Blocks.length; i++) {
        Blocks[i].init();
    }

    MinoIdToBeMoved = -1;
//    BlockIdToBeMoved=-1; // no piece selected

    projection = gl.getUniformLocation( program, "projection" );
    var pm = ortho( 0.0, canvas.width, 0.0, canvas.height, -1.0, 1.0 );
    gl.uniformMatrix4fv( projection, gl.TRUE, flatten(pm) );

    transformation = gl.getUniformLocation( program, "transformation" );

    vPosition = gl.getAttribLocation( program, "vPosition" );
    vColor = gl.getAttribLocation( program, "vColor" );

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    for (var i=0; i<Blocks.length; i++) {
        if(Blocks[i].drawBit == true) Blocks[i].draw();
    }

    // window.requestAnimFrame(render);
}
