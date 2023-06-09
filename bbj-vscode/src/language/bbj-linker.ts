
import {
    AstNodeDescription,
    DefaultLinker, LinkingError, ReferenceInfo
} from 'langium';

export class BbjLinker extends DefaultLinker {
    
    override getCandidate(refInfo: ReferenceInfo): AstNodeDescription | LinkingError {
        return super.getCandidate(refInfo);
    }
}