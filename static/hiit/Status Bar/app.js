const progress = document.getElementById("statusBar-progress");
var completeButton = document.getElementById("w-node-_6127cee6-3ab9-3aad-f652-c339ceede142-a20c2e40");
console.log(completeButton);
const circles = document.querySelectorAll(".statusBar-circle");

let currentActive = 1;

completeButton.addEventListener("click", ()=>{
    currentActive++;
    
    if (currentActive > circles.length){
        currentActive = circles.length;
    }
    update(); 
});

// THIS IS FOR USING THE PREV BUTTON
// prev.addEventListener("click", ()=>{
//     currentActive--;
    
//     if (currentActive < 1){
//         currentActive = 1;
//     }
//     update();
// });

function update() {
    circles.forEach((circle, idx)=>{
        if (idx < currentActive) {
            circle.classList.add("active");
        } else{
            circle.classList.remove("active");
        }
    });

    const actives = document.querySelectorAll(".active");

    console.log(actives.length,circles.length);
    progress.style.width = ((actives.length - 1) / (circles.length - 1))*100 + "%";

}

update();

