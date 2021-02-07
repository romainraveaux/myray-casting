/**********************************************
Raycasting implementation in Javascript.
First Demo
This demos is based on the ideas, explanations and codes developped here : 
Source: https://github.com/permadi-com/ray-cast/tree/master/demo/1

See it in action: https://permadi.com/tutorial/raycast/demo/1/


However, Romain Raveaux has made its own reimplementation of the demo along with his own explanations. The code is then fairly different. The goal was to create a project for computer science students.
https://gitlab.com/romain.raveaux/myray-casting/

Why this tutorial ?
My tutorial differs from the original one by different aspects :
Explanations come with pieces of codes to illustrate the explained notions
The code is decomposed into many readable functions. The code is less optimized than the original one but we hope it is more readable.
The code is scalable to different screen resolutions by changing the Canvas size.


What's on this demo:
Wall finding
Fishbowl / distortion corrections
Simple flat wall shading
Rendering of simple (static) ground and sky
Movement handling

The original software is under MIT License. We recall below : 
---------------

License: MIT (https://opensource.org/licenses/MIT)

Copyright 2015-2018 F. Permadi

Permission is hereby granted, free of charge, to any person obtaining a copy of this 
software and associated documentation files (the "Software"), 
to deal in the Software without restriction, 
including without limitation the rights to use, copy, modify, merge, publish, 
distribute, sublicense, and/or sell copies of the Software, and to permit persons to 
whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

***********************************************/


function GameWindow(canvas) {
			// create the main canvas
			this.width = canvas.width;
			this.height = canvas.height;  
			this.canvas = canvas;  
			this.context = this.canvas.getContext( '2d' );
			this.animationFrameID;	
			this.frameRate =24;
			

			//PROJECTION ATTRIBUTES
			this.FOV=60
			this.FOVrad=this.degreeToRad(this.FOV)
			this.HalfFOV=this.FOV/2
			this.HalfFOVrad=this.degreeToRad(this.HalfFOV)
			this.CenterProjectionPlaneX=this.width/2
			this.CenterProjectionPlaneY=this.height/2
			this.DistanceProjectionPlane=this.CenterProjectionPlaneX/Math.tan(this.HalfFOVrad);
			this.AngleRadByColumn=this.FOVrad/this.width			
			console.log("DistanceProjectionPlane="+this.DistanceProjectionPlane);
			
			// Size of a wall = 64 pixels
			this.wallsize=64
			
			// 2 dimensional map using grid coordinates
			this.fMap=[];
			this.MAP_WIDTH=6+3;
			this.MAP_HEIGHT=6+1; 
			
			
			// Some features to display the mini map	
			this.MAP_MAX_WIDTH=16;
			this.MAP_MAX_HEIGHT=8;
			this.mini_map_size=8;
			//This mini map width for display
			this.minimapdisplaywidth = this.MAP_MAX_WIDTH*this.mini_map_size;
			//This mini map height for display
			this.minimapdisplayheight = this.MAP_MAX_HEIGHT*this.mini_map_size;
			//This mini map x offset for display
			this.xminimapoffset=this.width-this.minimapdisplaywidth;
			this.yminimapoffset = 0;

			
			//Coordinates of the Wall intersections points. Horizontal and Vertical intersections.
			this.xunitHintersection=-1;
			this.yunitHintersection=-1;
			
			this.xunitVintersection=-1;
			this.yunitVintersection=-1;
			
			//Tan of the rayangle
			this.tanrayangle=-1;
			
			
			//Table of Distances from the player to the walls.
			this.nbangles=this.width;
			this.distancesToWalls=new Array(this.nbangles);
			
			//The coordinates of the player in the unit coordinates
			//system
			this.xunitplayer;
			this.yunitplayer;
			//The point of view in radian of the player
			this.POVrad;
			
						
			//Player step in pixels 
			//The size of one step
			//The speed of the player
			this.PlayerStep = 4;
			
			//The player rotation speed
			this.anglestepplayer=this.degreeToRad(1);
			
			//The size of the wall in the mini map
			this.playersize=8
	
			//Keyboard variables
			//Key to go up
			this.fKeyUp=false;
			//Key to go down
			this.fKeyDown=false;
			this.fKeyLeft=false; 
			this.fKeyRight=false;
			
			this.draw=1;
			this.shading=1;
			this.debug=0;
			
			this.shadingnorm=750.0;
		}
		
		GameWindow.prototype = 
		{
		
			init : function() 
			{
				this.xunitplayer=100;
				this.yunitplayer=500;
				cssColor="red";
				
				this.loadMap();
				this.drawMap();
				this.drawPlayer(cssColor,this.playersize);
				
				
				var POVdegree=90;
				this.POVrad=this.degreeToRad(POVdegree);
				
				
				this.ComputeBestWallIntersections(this.xunitplayer,this.yunitplayer,this.POVrad,this.debug,this.draw);
				
				this.drawWalls(this.xunitplayer,this.yunitplayer,this.POVrad,this.shading);
				
			},
			
			
			FishbowlCorrection : function(distancetowall,rayangle) 
			{
				beta=this.POVrad-rayangle;
				return distancetowall*Math.cos(beta);
			},
			
			start : function() 
			{
				this.init();
				this.update();
				
				window.addEventListener("keydown", this.handleKeyDown.bind(this), false);
				window.addEventListener("keyup", this.handleKeyUp.bind(this), false);
		
				this.animationFrameID = requestAnimationFrame(this.update.bind(this));
			},
			
			
			handleKeyDown : function(e) 
			{

				if (!e)
					e = window.event;

				// UP keypad
				if (e.keyCode == '38'  || String.fromCharCode(e.keyCode)=='W') 
				{
					this.fKeyUp=true;
					//console.log("down");
				}
				
				// DOWN keypad
				if (e.keyCode == '40' || String.fromCharCode(e.keyCode)=='S') 
				{
					this.fKeyDown=true;
				}
				
				// LEFT keypad
				else if (e.keyCode == '37'  || String.fromCharCode(e.keyCode)=='A') 
				{
				   this.fKeyLeft=true;
				}
				// RIGHT keypad
				else if (e.keyCode == '39'  || String.fromCharCode(e.keyCode)=='D') 
				{
				   this.fKeyRight=true;
				}
			},
			
			handleKeyUp : function(e) 
			{
				if (!e)
					e = window.event;

				// UP keypad
				if (e.keyCode == '38'  || String.fromCharCode(e.keyCode)=='W') 
				{
					this.fKeyUp=false;
					//console.log("up");
				}
				
				// DOWN keypad
				else if (e.keyCode == '40' || String.fromCharCode(e.keyCode)=='S') 
				{
					this.fKeyDown=false;
				}
				
				// LEFT keypad
				if (e.keyCode == '37'  || String.fromCharCode(e.keyCode)=='A') 
				{
				   this.fKeyLeft=false;
				}
				// RIGHT keypad
				if (e.keyCode == '39'  || String.fromCharCode(e.keyCode)=='D') 
				{
				   this.fKeyRight=false;
				}
			},
			
			UpdatePlayerCoordinates : function (){
			
					//  _____     _
				// |\ arc     |
				// |  \       y
				// |    \     |
				//            -
				// |--x--|  
				//
				//  sin(arc)=y/diagonal
				//  cos(arc)=x/diagonal   where diagonal=speed
				var playerXDir=Math.cos(this.POVrad);
				var playerYDir=Math.sin(this.POVrad);;

				// move forward
				if (this.fKeyUp)
				{
					this.xunitplayer+=Math.round(playerXDir*this.PlayerStep);
					this.yunitplayer-=Math.round(playerYDir*this.PlayerStep);
				}
				// move backward
				else if (this.fKeyDown)
				{
					
					this.xunitplayer-=Math.round(playerXDir*this.PlayerStep);
					this.yunitplayer+=Math.round(playerYDir*this.PlayerStep);
				}
			
			},
			
			UpdatePov : function (){
				if (this.fKeyLeft)
				{
					this.POVrad+=this.anglestepplayer;
					if (this.POVrad>=2*Math.PI){
						this.POVrad-=2*Math.PI;
					}
					
				}
				  // rotate right
				else if (this.fKeyRight)
				{
					this.POVrad-=this.anglestepplayer;
					if (this.POVrad<0){
						this.POVrad+=2*Math.PI;
						
					}
				}
			},
		
			// This function is called every certain interval (see this.frameRate) to handle input and render the screen
			update : function() 
			{
				this.drawBackground();
				this.drawMap();
				this.drawPlayer(cssColor,this.playersize);
				
				
				this.ComputeBestWallIntersections(this.xunitplayer,this.yunitplayer,this.POVrad,this.debug,this.draw);
				
				this.drawWalls(this.xunitplayer,this.yunitplayer,this.POVrad,this.shading);
				
				this.UpdatePov();
				this.UpdatePlayerCoordinates();
				
				var object=this;
			
				// Render next frame
				setTimeout(function() 
				{
					object.animationFrameID = requestAnimationFrame(object.update.bind(object));
				}, 1000 / this.frameRate);
				
			},
		
		
		
		
			
			xytoindex: function(x,y,width)
			{
				index = x + width*y;
				return index;
			},
			
			drawFillRectangle: function(x, y, width, height, cssColor)
			{
				this.context.fillStyle = cssColor; 
				this.context.beginPath();
				this.context.rect(x, y, width, height);
				this.context.closePath();
				this.context.fill();		
			},
			
			
			
			
			//*******************************************************************//
			drawBackground : function()
			{
				// sky
				var c=255;
				var r;
				var incement=1;
				for (r=0; r<this.height/2; r+=incement)
				{
					var cssColor=this.rgbToHexColor(c, 125, 225);
					this.drawLine(0, r, this.width,r, cssColor);			
					c-=incement;
				}
				// ground
				c=22;
				for (; r<this.height; r+=incement)
				{
					var cssColor=this.rgbToHexColor(c, 20, 20);
					
					this.drawLine(0, r, this.width,r, cssColor);			
					c+=incement;
				}
			},
			
			loadMap: function()
			{
			// CREATE A SIMPLE MAP.
				// Use string for elegance (easier to see).  W=Wall, O=Opening
				var map=
							'WWWWWWWWW'+
							'WOOOOOOOW'+
							'WOOOOOOOW'+
							'WOOOOOOOW'+
							'WOOOOOOOW'+
							'WOOOOOOOW'+
							'WWWWWWWWW';
							
				var map3=
                'WWWWWWWWWWWW'+
                'WOOOOOOOOOOW'+
                'WOOOOOOOOOOW'+
                'WOOOOOOOWOOW'+
                'WOOWOWOOWOOW'+
                'WOOWOWWOWOOW'+
                'WOOWOOWOWOOW'+
                'WOOOWOWOWOOW'+
                'WOOOWOWOWOOW'+
                'WOOOWWWOWOOW'+
                'WOOOOOOOOOOW'+
                'WWWWWWWWWWWW';	
				
				this.MAP_WIDTH=12;
				this.MAP_HEIGHT=12;
				// Remove spaces and tabs
				this.fMap=map3.replace(/\s+/g, '');	
				
			},
			
			drawMap: function()
			{
				

				for (var y=0; y<this.MAP_HEIGHT; y++)
				{
					for (var x=0; x<this.MAP_WIDTH; x++)
					{
						var cssColor="white";
						index=this.xytoindex(x,y,this.MAP_WIDTH);
						if (this.fMap.charAt(index)=="W")
						{
							cssColor="black";
						}
						else
						{
						}
						xstart=x*this.mini_map_size+this.xminimapoffset;
						
						ystart=y*this.mini_map_size;
						this.drawFillRectangle(xstart,
					ystart, this.mini_map_size, this.mini_map_size, cssColor);
					}
				}
				
			},
			//*******************************************************************//
			//* Convert arc (degree) to radian
			//*******************************************************************//
			degreeToRad: function(arcAngle)
			{
				return ((arcAngle*Math.PI)/180);    
			},
			
			drawLine: function(startX, startY, endX, endY, cssColor)
			{
				//console.log("cssColor="+cssColor);
				this.context.strokeStyle  = cssColor; 
				this.context.beginPath();
				this.context.moveTo(startX, startY);
				this.context.lineTo(endX, endY);	
				this.context.stroke();	
			},
			

		
			rgbToHexColor : function(red, green, blue) 
			{
				var result="#"+
					red.toString(16).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+""+
					green.toString(16).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+""+
					blue.toString(16).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false});
				return result;
			},
			
			
			fromUnitCoordinatesToMiniMapCoordinates : function(xunitplayer,xornot){
				var xminimap=Math.floor(this.mini_map_size*xunitplayer/this.wallsize);
				if(xornot==1){
					xminimap=xminimap+this.xminimapoffset;
				}
				return xminimap;
			},
			
			drawPlayer : function(cssColor,size)
			{	
				xminimap=this.fromUnitCoordinatesToMiniMapCoordinates(this.xunitplayer,1);
				
				yminimap=this.fromUnitCoordinatesToMiniMapCoordinates(this.yunitplayer,0);
				
				
				
				this.drawFillRectangle(xminimap,yminimap, size, size, cssColor);
			},
			
			

			//Precompute tan(rayangle)
			//This value will be used 4 times
			//So we can store it
			ComputeTanRayAngle: function(rayangle)
			{
				this.tanrayangle=Math.tan(rayangle);
			},
			
			//Find Ya
			//For the horizontal case, the height
			//is always the height the wall 
			findYaHorizontal: function(rayangle)
			{
				// Ray is facing up
				if (rayangle > 0 && rayangle < Math.PI)
				{
					return -this.wallsize;
				}else
				{
					// Ray is facing down
					return this.wallsize;
				}
				
			},

			//Find the Y coordinate of A
			//We first need to find the grid coordinates
			//of the player 
			//Then we multiply the grid coordinates by the wall size
			findYofPointAHorizontal: function(rayangle,xunitplayer,yunitplayer,Ya)
			{
				var ygridplayer= Math.floor(yunitplayer/this.wallsize);
				var yaunitplayer;
				if (Ya<0){
					yaunitplayer=(ygridplayer*this.wallsize)-1;
				}else{
					yaunitplayer=(ygridplayer*this.wallsize)+this.wallsize;
				}
				
				return yaunitplayer;
			},
			
			//Find Xa
			//We find Xa according to the trigonometry formula
			findXaHorizontal: function(rayangle)
			{	
				var xaunit=this.wallsize/(this.tanrayangle);
				//var res=Math.floor(xaunit);
				var res=xaunit;
				
				// Ray is facing up
				if (rayangle > 0 && rayangle < Math.PI)
				{
					return res;
				}else
				{
					// Ray is facing down
					return -res;
				}
				
				return res;
			},
			
			//Find the X coordinate of A
			//For the first point.
			//The height is not the wall height in that case
			//but the difference between Y of the player and Y of the Horizontal hit.
			findXofPointAHorizontal: function(rayangle,xunitplayer,yunitplayer,yaunitplayer)
			{
				var xaunitplayer = xunitplayer+(yunitplayer-yaunitplayer)/this.tanrayangle;
				
				//return Math.floor(xaunitplayer);
				return xaunitplayer;
			},
			
			computeNextIntersectionX: function (rayangle,xaunitplayer,yaunitplayer,xaunit,yaunit)
			{
				var xcunitplayer=xaunitplayer+xaunit;
				return xcunitplayer;
				
			},
			
			computeNextIntersectionY: function (rayangle,xaunitplayer,yaunitplayer,xaunit,yaunit)
			{
				
				var ycunitplayer=yaunitplayer+yaunit;
				return ycunitplayer;
			},
			
			
			//Is A a wall ?
			CheckIfWall: function(xaunitplayer,yaunitplayer)
			{
				var xagridplayer=Math.floor(xaunitplayer/this.wallsize);
				var yagridplayer=Math.floor(yaunitplayer/this.wallsize);
				var index=this.xytoindex(xagridplayer,yagridplayer,this.MAP_WIDTH);
				if (this.fMap.charAt(index)=="W")
				{
					return 1;
				}
				else
				{
					return 0;
				}
			},
			
			//Is the player outside the map
			CheckIfOutsideMap: function(xaunitplayer,yaunitplayer)
			{
				var xagridplayer=Math.floor(xaunitplayer/this.wallsize);
				var yagridplayer=Math.floor(yaunitplayer/this.wallsize);
				
				// If we've looked as far as outside the map range, then bail out
				if ((xagridplayer>=this.MAP_WIDTH) ||
					(yagridplayer>=this.MAP_HEIGHT) ||
					xagridplayer<0 || yagridplayer<0)
				{
					return true;
				}else{
					return false;
				}
				
			},
			
			//ComputeDistance
			EuclideanDistanceBetweenPoints: function(xunitplayer,yunitplayer,xaunitplayer,yaunitplayer)
			{
				var x=(xunitplayer-xaunitplayer);
				xsquare=x*x;
				
				var y=(yunitplayer-yaunitplayer);
				ysquare=y*y;
				var dist=Math.sqrt(xsquare+ysquare);
				return dist;
				
			},
			
			//Compute the horizontal intersection point to a wall 
			//and the distance between player and the intersection
			FindWallHorizontal: function(xunitplayer,yunitplayer,rayangle,debug)
			{	
				var distance = Number.MAX_VALUE;
				
				var Ya=this.findYaHorizontal(rayangle);
				
				var Xa=this.findXaHorizontal(rayangle);
				
				var Ay=this.findYofPointAHorizontal(rayangle,xunitplayer,yunitplayer,Ya);
				
				var Ax=this.findXofPointAHorizontal(rayangle,xunitplayer,yunitplayer,Ay);
				
				
				if(debug==1)
				{
					console.log("Ya="+Ya);
					console.log("Xa="+Xa);
					console.log("xunitplayer="+xunitplayer);
					console.log("yunitplayer="+yunitplayer);
					console.log("Ax="+Ax);
					console.log("Ay="+Ay);
				}
				
				
				
				if(this.CheckIfOutsideMap(Ax,Ay)==false){
					if(debug==1)
					{
						this.drawLine(xunitplayer,
							yunitplayer,Ax,Ay,"green");
						this.drawFillRectangle(Ax,Ay, this.wallsize/8, this.wallsize/8, "purple");
					}
					var wallhit=this.CheckIfWall(Ax,Ay);
				
					if (wallhit==1){
						 distance=this.EuclideanDistanceBetweenPoints(xunitplayer,yunitplayer,Ax,Ay);
						if(debug==1)
						{
							console.log("distance="+distance);
							console.log("wallhit="+wallhit);
						}
						this.xunitHintersection=Ax;
						this.yunitHintersection=Ay;
						return distance;
					}
				}
					
				var xold=Ax;
				var yold=Ay;
				while(wallhit != 1 && this.CheckIfOutsideMap(xold,yold)==false ){
					var xnew=this.computeNextIntersectionX (rayangle,xold,yold,Xa,Ya);
					var ynew=this.computeNextIntersectionY (rayangle,xold,yold,Xa,Ya);
					wallhit=this.CheckIfWall(xnew,ynew);
					
					if(debug==1)
					{
						this.drawLine(xunitplayer,
							yunitplayer,xnew,ynew,"green");
							this.drawFillRectangle(xnew,ynew, this.wallsize/8, this.wallsize/8, "purple");
							console.log("xnew="+xnew);
							console.log("ynew="+ynew);
				
					}
					
					xold=xnew;
					yold=ynew;
				}
				
				if (wallhit==1){
					distance=this.EuclideanDistanceBetweenPoints(xunitplayer,yunitplayer,xold,yold);
					if(debug==1)
					{
						console.log("distance="+distance);
						console.log("wallhit="+wallhit);
						
						this.drawFillRectangle(xold,yold, this.wallsize/8, this.wallsize/8, "purple");
				
					}
					this.xunitHintersection=xold;
					this.yunitHintersection=yold;
					return distance;
				}
				this.xunitHintersection=-1;
				this.yunitHintersection=-1;
				return distance;
	
			},
			
			DisplayFindWallHorizontal : function()
			{
				var xunitplayer=this.width/2-32;
				var yunitplayer=this.MAP_HEIGHT*this.wallsize-2.5*this.wallsize;
				var debug=1;
					
				for (var angle=0; angle<360; angle=angle+15)
				{
					var rayangle=this.degreeToRad(angle);
					this.ComputeTanRayAngle(rayangle);
					this.FindWallHorizontal(xunitplayer,yunitplayer,rayangle,debug);
				}
				
				
			},
			
			/**********************
			Vertical Intersection
			**********************/
			
			//Find Ya Vertical
			findYaVertical: function(rayangle)
			{
				var Ya=this.wallsize*this.tanrayangle;
				if (rayangle >= Math.PI/2 && rayangle < (3*Math.PI/2))
				{
					
				}else{
					Ya=-Ya;
				}
				//return Math.floor(Ya);
				return Ya;
				
				
			},
			
			//Find Xa
			findXaVertical: function(rayangle)
			{
				// Ray is facing left
				if (rayangle >= Math.PI/2.0 && rayangle < (3*Math.PI/2.0))
				{
					return -this.wallsize;
				}else
				{
					// Ray is facing right
					return this.wallsize;
				}
				
			},
			
			//Find the X coordinate of A
			//We first need to find the grid coordinates
			//of the player 
			//Then we multiply the grid coordinates by the wall size
			findXofPointAVertical: function(rayangle,xunitplayer,yunitplayer,Xa)
			{
				var xgridplayer= Math.floor(xunitplayer/this.wallsize);
				var xaunitplayer;
				if (Xa<0){
					xaunitplayer=(xgridplayer*this.wallsize)-1;
				}else{
					xaunitplayer=(xgridplayer*this.wallsize)+Xa;
				}
				return xaunitplayer;
			},
			
			//Find the Y coordinate of A
			//For the first point.
			//The width is not the wall width in that case
			//but the difference between X of the player and X of the Vertical hit.
			findYofPointAVertical: function(rayangle,xunitplayer,yunitplayer,xaunitplayer)
			{
				var yaunitplayer=yunitplayer+((xunitplayer-xaunitplayer)*this.tanrayangle);
				
				//return Math.floor(yaunitplayer);
				return yaunitplayer;
			},
			
			//Compute the vertical intersection point to a wall 
			//and the distance between player and the intersection
			FindWallVertical: function(xunitplayer,yunitplayer,rayangle,debug)
			{	
				var distance = Number.MAX_VALUE;
				var Ya=this.findYaVertical(rayangle);
				
				var Xa=this.findXaVertical(rayangle);
				
				var Ax=this.findXofPointAVertical(rayangle,xunitplayer,yunitplayer,Xa);
	
				var Ay=this.findYofPointAVertical(rayangle,xunitplayer,yunitplayer,Ax);
				
				if(debug==1)
				{
					console.log("Ya="+Ya);
					console.log("Xa="+Xa);
					console.log("xunitplayer="+xunitplayer);
					console.log("yunitplayer="+yunitplayer);
					console.log("Ax="+Ax);
					console.log("Ay="+Ay);
				}
				
				if(this.CheckIfOutsideMap(Ax,Ay)==false){
					if(debug==1)
					{
						this.drawLine(xunitplayer,
							yunitplayer,Ax,Ay,"green");
						this.drawFillRectangle(Ax,Ay, this.wallsize/8, this.wallsize/8, "purple");
					}
					var wallhit=this.CheckIfWall(Ax,Ay);
				
					if (wallhit==1){
						 distance=this.EuclideanDistanceBetweenPoints(xunitplayer,yunitplayer,Ax,Ay);
						if(debug==1)
						{
							console.log("distanceVertical="+distance);
							console.log("wallhit="+wallhit);
						}
						this.xunitVintersection=Ax;
						this.yunitVintersection=Ay;
						return distance;
					}
				}
				
				var xold=Ax;
				var yold=Ay;
				
				while(wallhit != 1 && this.CheckIfOutsideMap(xold,yold)==false){
					var xnew=this.computeNextIntersectionX (rayangle,xold,yold,Xa,Ya);
					var ynew=this.computeNextIntersectionY (rayangle,xold,yold,Xa,Ya);
					wallhit=this.CheckIfWall(xnew,ynew);
					
					if(debug==1)
					{
						this.drawLine(xunitplayer,
							yunitplayer,xnew,ynew,"green");
							this.drawFillRectangle(xnew,ynew, this.wallsize/8, this.wallsize/8, "purple");
							console.log("xnew="+xnew);
							console.log("ynew="+ynew);
				
					}
					
					xold=xnew;
					yold=ynew;
				}
				
				if (wallhit==1){
					distance=this.EuclideanDistanceBetweenPoints(xunitplayer,yunitplayer,xold,yold);
					if(debug==1)
					{
						console.log("distance="+distance);
						console.log("wallhit="+wallhit);
						
						this.drawFillRectangle(xold,yold, this.wallsize/8, this.wallsize/8, "purple");
				
					}
					this.xunitVintersection=xold;
					this.yunitVintersection=yold;
					return distance;
				}
				
				this.xunitVintersection=-1;
				this.yunitVintersection=-1;
				return distance;
	
			},
			
			
			/* DRAW WALL */
			
			ShadingGrey : function(greylevel,distance){
				// Add simple shading so that farther wall slices appear darker.
				// 750 is arbitrary value of the farthest distance.  
				dist=Math.floor(distance);
				var greyhaded=greylevel-(dist/this.shadingnorm)*255.0;
				// don't allow it to be too dark
				if (greyhaded < 0)
					greyhaded=0;
				if (greyhaded>255)
					greyhaded=255;
				greyhaded=Math.floor(greyhaded);
				
				var cssColor=this.rgbToHexColor(greyhaded,greyhaded,greyhaded);
				return cssColor
			},
		
			
			ShadingColor : function(r,g,b,distance){
				// Add simple shading so that farther wall slices appear darker.
				// 750 is arbitrary value of the farthest distance.  
				dist=Math.floor(distance);
				var rshaded=r-(dist/350.0)*255.0;
				var gshaded=g-(dist/350.0)*255.0;
				var bshaded=b-(dist/350.0)*255.0;
				// don't allow it to be too dark
				if (rshaded<0)
					rshaded=0;
				if (rshaded>255)
					rshaded=255;
				rshaded=Math.floor(rshaded);
				
				if (gshaded<0)
					gshaded=0;
				if (gshaded>255)
					gshaded=255;
				gshaded=Math.floor(gshaded);
				
				if (bshaded<0)
					bshaded=0;
				if (bshaded>255)
					bshaded=255;
				bshaded=Math.floor(bshaded);
				
				
				var cssColor=this.rgbToHexColor(rshaded,gshaded,bshaded);
				return cssColor
			},
			
			
			
			/* Draw the walls from a player
			defined by its coordinates
			and a point of view (where he is watching)
			*/
			drawWalls : function(xunitplayer,yunitplayer,POVrad,shading){
			
					//We get all the distances from the player
					//to the wall
					this.ComputeBestWallIntersections(xunitplayer,yunitplayer,POVrad,0,0)
					//For all the column we draw a vertical line
					// The column 0 is equal to the ray of 60 degree
					// of the FOV
					//Reversely the table distancesToWalls
					//contains ray distances for ray starting from
					// 0 degree to 60 degree
					var y=this.height;	
					for (var x=0;x<this.width;x++){
						//distance to the wall
						var d=this.distancesToWalls[x];
						//column number
						var column=this.width-x;
					  
						//Height of the projected height
						var wallheight=this.DistanceProjectionPlane*this.wallsize/d;
						var halfwallheight=wallheight/2;
						var ystart=this.CenterProjectionPlaneY-halfwallheight;
						var yend=this.CenterProjectionPlaneY+halfwallheight;
						
						if(shading==1){
							var cssColor=this.ShadingGrey(255,d);
						}
						//this.drawLine(column,ystart,column,yend,cssColor);
						this.drawFillRectangle(column,ystart,1,yend-ystart,cssColor);
					}
				},
				
				
				
			
			/* Find Disance to walls */
			ComputeOneBestWallIntersection : function(xunitplayer,yunitplayer,rayangle,draw,debug)
			{
				this.ComputeTanRayAngle(rayangle);
				var dv=this.FindWallVertical(xunitplayer,yunitplayer,rayangle,0);
				var dh=this.FindWallHorizontal(xunitplayer,yunitplayer,rayangle,0);
				var d=0;
				if (dh<dv){
					if(draw==1){
						xunitplayerminimap=this.fromUnitCoordinatesToMiniMapCoordinates(xunitplayer,1);
						yunitplayerminimap=this.fromUnitCoordinatesToMiniMapCoordinates(yunitplayer,0);
						
						xunitHintersectionminimap=this.fromUnitCoordinatesToMiniMapCoordinates(this.xunitHintersection,1);
						yunitHintersectionminimap=this.fromUnitCoordinatesToMiniMapCoordinates(this.yunitHintersection,0);
						
						
						this.drawLine(xunitplayerminimap,yunitplayerminimap,xunitHintersectionminimap,yunitHintersectionminimap,'green');
					}
					d=this.FishbowlCorrection(dh,rayangle);
					//d=dh;
				}else{
					if(draw==1){
						xunitplayerminimap=this.fromUnitCoordinatesToMiniMapCoordinates(xunitplayer,1);
						yunitplayerminimap=this.fromUnitCoordinatesToMiniMapCoordinates(yunitplayer,0);
						
						xunitVintersectionminimap=this.fromUnitCoordinatesToMiniMapCoordinates(this.xunitVintersection,1);
						yunitVintersectionminimap=this.fromUnitCoordinatesToMiniMapCoordinates(this.yunitVintersection,0);
						
						this.drawLine(xunitplayerminimap,yunitplayerminimap,xunitVintersectionminimap,yunitVintersectionminimap,'blue');
					}
					//d=dv;
					d=this.FishbowlCorrection(dv,rayangle);
				}
				if(debug==1){
					var str="";
					console.log("dv="+dv);
					console.log("dh="+dh);
					console.log("d="+d);
					str="dv="+dv+"\ndh="+dh+"\nmin d="+d;
					return str;
				}
				return d;
			},
			
			
			
			ComputeBestWallIntersections : function(xunitplayer,yunitplayer,POVrad,debug,draw)
			{
			
				var startangle=POVrad-this.HalfFOVrad;
				
				// wrap around if necessary
				if (startangle < 0)
				{
					startangle=2*Math.PI + startangle;
				}
				
				
				var endangle=POVrad+this.HalfFOVrad;
				// wrap around if necessary
				if (endangle>=2*Math.PI){
					endangle-=2*Math.PI;
				}
				
				var str="";
				var rayangle=startangle;
				
				for (var i=0; i<this.nbangles; i++)
				{	
					var d=this.ComputeOneBestWallIntersection(xunitplayer,yunitplayer,rayangle,draw,0);
					
					this.distancesToWalls[i]=d;
					if(debug==1){
						str+="i="+i+"   min d="+d+"\n";
					}
					rayangle=rayangle+this.AngleRadByColumn;
					// wrap around if necessary	
					if (rayangle>=2*Math.PI){
						rayangle-=2*Math.PI;
					}
				}
				if(debug==1){
					return str;
				}
				return 1;
			}
		}
	