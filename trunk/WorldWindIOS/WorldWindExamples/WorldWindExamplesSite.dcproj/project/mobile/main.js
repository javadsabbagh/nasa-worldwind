/* 
 This file was generated by Dashcode.  
 You may edit this file to customize your widget or web page 
 according to the license.txt file included in the project.
 */

//
// Function: load()
// Called by HTML body element's onload event when the web application is ready to start
//
function load()
{
    dashcode.setupParts();
}


function handleInstallButtonClick(event)
{
    location = "itms-services://?action=download-manifest&url=http://worldwindserver.net/ios/examples/install/WorldWindExamples.plist";
}