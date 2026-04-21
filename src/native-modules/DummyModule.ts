'use strict';
import { TurboModuleRegistry, TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  sayHello(): string;
}

export default TurboModuleRegistry.getEnforcing<Spec>('DummyModule');
