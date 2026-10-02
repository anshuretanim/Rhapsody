import './Body.css';

function Body(){

async function handleFile(event){
       
        const file = event.target.files[0];

        if (!file) return;

        const formData = new FormData();

        formData.append("file", file);

        const response = await fetch("http://localhost:5000/upload", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        console.log(result);
    
}

return(
    <div className='lower-body'>
<h1 className='rhapsody-title'>RHAPSODY</h1>
<div className='heading'>
    <h1 className='mainHeading'>Choose a file to <span> get started</span></h1>
    <form className = 'takeFile'>
        <input className='input-form' type='file' 
        accept = '.csv'
        onChange={handleFile} />
    </form>
</div>





    </div>
);


}



export default Body;