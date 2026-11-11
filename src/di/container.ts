import { CameraRepositoryImpl } from '../data/repositories/CameraRepositoryImpl';
import { DetectorRepositoryImpl } from '../data/repositories/DetectorRepositoryImpl';
import { PrepareDetectorUseCase } from '../domain/usecases/PrepareDetectorUseCase';
import { ScanPhotoUseCase } from '../domain/usecases/ScanPhotoUseCase';

const detectorRepository = new DetectorRepositoryImpl();
const cameraRepository = new CameraRepositoryImpl();

/** Composition root: cablea implementaciones de datos a casos de uso del dominio. */
export const prepareDetectorUseCase = new PrepareDetectorUseCase(detectorRepository);
export const scanPhotoUseCase = new ScanPhotoUseCase(detectorRepository, cameraRepository);
