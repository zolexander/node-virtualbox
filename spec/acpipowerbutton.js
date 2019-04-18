import virtualbox from "../lib/virtualbox";
describe ("acpipowerbutton() test",() => {
    const virtualmachine = "ubuntu"
    it("should be call from virtualbox",(done) => {
        virtualbox.isRunning(virtualmachine).then(isrunning => {
            if(isrunning ) {
            virtualbox.acpipowerbutton().then( ()=> {

            }).catch( error => {
                expect(() =>{

                });
            })
        })
    })
});