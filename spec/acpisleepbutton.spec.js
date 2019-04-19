const virtualbox = require("../lib/virtualbox");
describe ("acpisleepbutton() test ",() => {
    const virtualmachine = "ubuntu";
    const result = true;
    it("should be call from virtualbox",(done) => {
      spyOn(virtualbox,"acpisleepbutton").and.callFake((virtualmachine) =>{
        return new Promise( (resolve,reject) => {
                resolve(true);
             });
            });
      virtualbox.acpisleepbutton(virtualmachine).then( res =>{
        expect(res).toBe(result);
        done();
      }); 
    });
    it("Should be catch an error", (done) =>{
      const fetchspy = spyOn(virtualbox,"acpisleepbutton").and.returnValue(Promise.reject());
      virtualbox.acpisleepbutton().catch(error => {
        expect(fetchspy).toHaveBeenCalled();
        done();
      });
    });
});