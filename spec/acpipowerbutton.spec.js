const virtualbox = require("../lib/virtualbox");
describe ("acpipowerbutton()",() => {
    const virtualmachine = "ubuntu";
    const result = true;
    it("should be call from virtualbox",(done) => {
      spyOn(virtualbox,"acpipowerbutton").and.callFake((virtualmachine) =>{
        return new Promise( (resolve,reject) => {
                resolve(true);
             });
            });
      virtualbox.acpipowerbutton(virtualmachine).then( res =>{
        expect(res).toBe(result);
        done();
      }); 
    });
    it("Should be catch an error", (done) =>{
      const fetchspy = spyOn(virtualbox,"acpipowerbutton").and.returnValue(Promise.reject());
      virtualbox.acpipowerbutton().catch(error => {
        expect(fetchspy).toHaveBeenCalled();
        done();
      });
    });
});