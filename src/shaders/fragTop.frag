#version 300 es

precision mediump float;

uniform float iTime;
uniform vec3 iResolution;
uniform vec4 iMouse;
uniform sampler2D iChannel0;
uniform float iConectivity;
uniform vec3 iColor;
uniform float iFrequency;

out vec4 fragColor;