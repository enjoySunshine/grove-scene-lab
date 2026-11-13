import { ArcRotateCamera } from "core/Cameras/arcRotateCamera";
import { Camera } from "core/Cameras/camera";
import { FreeCamera } from "core/Cameras/freeCamera";
import { BoundingSphere } from "core/Culling/boundingSphere";
import { type Engine } from "core/Engines/engine";
import { Constants } from "core/Engines/constants";
import { NullEngine } from "core/Engines/nullEngine";
import { Vector3 } from "core/Maths/math.vector";
import { type Mesh } from "core/Meshes/mesh";
import { MeshBuilder } from "core/Meshes/meshBuilder";
import { Scene } from "core/scene";

describe("Babylon Mesh Levels of Details", () => {
    let subject: Engine;
    let scene: Scene;

    let knot0: Mesh;
    let knot1: Mesh;
    let knot2: Mesh;

    beforeEach(() => {
        subject = new NullEngine({
            renderHeight: 256,
            renderWidth: 256,
            textureSize: 256,
            deterministicLockstep: false,
            lockstepMaxSteps: 1,
        });

        scene = new Scene(subject);

        knot0 = MeshBuilder.CreateTorusKnot(
            "Knot0",
            {
                radius: 10,
                tube: 3,
                radialSegments: 128,
                tubularSegments: 64,
                p: 2,
                q: 3,
            },
            scene
        );
        knot1 = MeshBuilder.CreateTorusKnot(
            "Knot1",
            {
                radius: 10,
                tube: 3,
                radialSegments: 64,
                tubularSegments: 32,
                p: 2,
                q: 3,
            },
            scene
        );
        knot2 = MeshBuilder.CreateTorusKnot(
            "Knot2",
            {
                radius: 10,
                tube: 3,
                radialSegments: 32,
                tubularSegments: 16,
                p: 2,
                q: 3,
            },
            scene
        );
    });

    afterEach(() => {
        subject.dispose();
    });

    describe("getLOD method", () => {
        let cameraArc: ArcRotateCamera;
        let cameraOrthographic: ArcRotateCamera;

        beforeEach(() => {
            cameraArc = new ArcRotateCamera("Camera", 0, 0, 5, new Vector3(0, 0, 0), scene);

            cameraOrthographic = new ArcRotateCamera("Camera", 0, 0, 5, new Vector3(0, 0, 0), scene);
            cameraOrthographic.mode = Camera.ORTHOGRAPHIC_CAMERA;
        });

        it("should return self mesh when lods are not defined", () => {
            cameraArc.radius = 15;
            scene.render();
            expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot0");

            cameraArc.radius = 25;
            scene.render();
            expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot0");
        });

        it("should add lod level by chaining", () => {
            knot0.addLODLevel(10, knot1).addLODLevel(20, knot2);

            cameraArc.radius = 15;
            scene.render();
            expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot1");

            cameraArc.radius = 25;
            scene.render();
            expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot2");
        });

        describe("check LOD by distance", () => {
            beforeEach(() => {
                knot0.addLODLevel(10, knot1);
                knot0.addLODLevel(20, knot2);
            });

            it("should select lod with correct distance", () => {
                expect(knot0.getLOD(cameraArc)).not.toBeNull();
                expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot0");

                cameraArc.radius = 15;
                scene.render();
                expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot1");

                cameraArc.radius = 25;
                scene.render();
                expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot2");
            });

            it("should select lod with correct distance for orthographic camera", () => {
                expect(knot0.getLOD(cameraOrthographic)).not.toBeNull();
                expect(knot0.getLOD(cameraOrthographic)!.name).toEqual("Knot0");

                cameraOrthographic.minZ = 15;
                scene.render();
                expect(knot0.getLOD(cameraOrthographic)!.name).toEqual("Knot1");

                cameraOrthographic.minZ = 25;
                scene.render();
                expect(knot0.getLOD(cameraOrthographic)!.name).toEqual("Knot2");
            });

            it("should select loaded mesh while target lod mesh is not loaded yet", () => {
                // not loaded yet
                knot1.delayLoadState = Constants.DELAYLOADSTATE_NOTLOADED;
                knot2.delayLoadState = Constants.DELAYLOADSTATE_NOTLOADED;

                cameraArc.radius = 15;
                scene.render();
                expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot0");

                cameraArc.radius = 25;
                scene.render();
                expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot0");

                // while loading
                knot1.delayLoadState = Constants.DELAYLOADSTATE_LOADING;
                knot2.delayLoadState = Constants.DELAYLOADSTATE_LOADING;

                cameraArc.radius = 15;
                scene.render();
                expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot0");

                cameraArc.radius = 25;
                scene.render();
                expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot0");

                // after loaded
                knot1.delayLoadState = Constants.DELAYLOADSTATE_LOADED;
                knot2.delayLoadState = Constants.DELAYLOADSTATE_LOADED;

                cameraArc.radius = 15;
                scene.render();
                expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot1");

                cameraArc.radius = 25;
                scene.render();
                expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot2");
            });

            it("should call user function with selected LOD", () => {
                const onLODLevelSelectionArgs: {
                    distance?: number;
                    meshName?: string;
                    selectedLevel?: string | null;
                } = {};
                knot0.onLODLevelSelection = (_distance, _mesh, _selectedLevel) => {
                    onLODLevelSelectionArgs.distance = _distance;
                    onLODLevelSelectionArgs.meshName = _mesh.name;
                    onLODLevelSelectionArgs.selectedLevel = _selectedLevel?.name;
                    return null;
                };

                const registerSpy = vi.spyOn(knot0, "onLODLevelSelection");

                expect(registerSpy).toHaveBeenCalledTimes(0);

                scene.render();
                expect(registerSpy).toHaveBeenCalledTimes(1);
                expect(onLODLevelSelectionArgs.distance).toBeCloseTo(5.23, 2);
                expect(onLODLevelSelectionArgs.meshName).toEqual("Knot0");
                expect(onLODLevelSelectionArgs.selectedLevel).toEqual("Knot0");

                cameraArc.radius = 15;
                scene.render();
                expect(registerSpy).toHaveBeenCalledTimes(2);
                expect(onLODLevelSelectionArgs.distance).toBeCloseTo(15.07, 2);
                expect(onLODLevelSelectionArgs.meshName).toEqual("Knot0");
                expect(onLODLevelSelectionArgs.selectedLevel).toEqual("Knot1");

                cameraArc.radius = 25;
                scene.render();
                expect(registerSpy).toHaveBeenCalledTimes(3);
                expect(onLODLevelSelectionArgs.distance).toBeCloseTo(25.03, 2);
                expect(onLODLevelSelectionArgs.meshName).toEqual("Knot0");
                expect(onLODLevelSelectionArgs.selectedLevel).toEqual("Knot2");
            });
        });

        describe("check LOD by screen coverage", () => {
            beforeEach(() => {
                knot0.useLODScreenCoverage = true;
                knot0.addLODLevel(0.5, knot1);
                knot0.addLODLevel(0.2, knot2);
                knot0.addLODLevel(0.02, null);
            });

            it("should select lod with correct screen coverage", () => {
                cameraArc.radius = 80;
                scene.render();
                expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot1");

                cameraArc.radius = 120;
                scene.render();
                expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot2");

                cameraArc.radius = 380;
                scene.render();
                expect(knot0.getLOD(cameraArc)).toBeNull();
            });
        });

        describe("useLODScreenCoverage", () => {
            it("should work correctly when set to true at any time relative to addLODLevel mesh", () => {
                // Set LOD meshes
                knot0.addLODLevel(0.5, knot1);
                knot0.addLODLevel(0.2, knot2);
                knot0.addLODLevel(0.02, null);

                // Then set useLODScreenCoverage to true
                knot0.useLODScreenCoverage = true;

                // And it should work correctly
                cameraArc.radius = 80;
                scene.render();
                expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot1");

                cameraArc.radius = 120;
                scene.render();
                expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot2");

                cameraArc.radius = 380;
                scene.render();
                expect(knot0.getLOD(cameraArc)).toBeNull();
            });
        });

        describe("check custom boundingSphere", () => {
            it("should use custom boundingSphere", () => {
                const customBoundingSphere = new BoundingSphere(new Vector3(0, 0, 0), new Vector3(1, 1, 1));

                // Set LOD meshes
                knot0.addLODLevel(10, knot1);
                knot0.addLODLevel(20, knot2);

                cameraArc.radius = 10;
                scene.render();
                expect(knot0.getLOD(cameraArc, customBoundingSphere)!.name).toEqual("Knot0");

                cameraArc.radius = 11;
                scene.render();
                expect(knot0.getLOD(cameraArc, customBoundingSphere)!.name).toEqual("Knot1");

                cameraArc.radius = 21;
                scene.render();
                expect(knot0.getLOD(cameraArc, customBoundingSphere)!.name).toEqual("Knot2");
            });
        });
    });

    describe("removeLODLevel", () => {
        let cameraArc: ArcRotateCamera;

        beforeEach(() => {
            cameraArc = new ArcRotateCamera("Camera", 0, 0, 5, new Vector3(0, 0, 0), scene);
        });

        it("should remove lod level", () => {
            knot0.addLODLevel(10, knot1);
            knot0.addLODLevel(20, knot2);

            knot0.removeLODLevel(knot1);
            knot0.removeLODLevel(knot2);

            // After remove lod levels, the LOD should be the original mesh with any radius
            [5, 15, 25].forEach((radius) => {
                cameraArc.radius = radius;
                scene.render();
                expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot0");
            });

            // And no one lod level should be left
            expect(knot0.getLODLevels().length).toEqual(0);
        });

        it("should remove lod levels with chaining", () => {
            knot0.addLODLevel(10, knot1);
            knot0.addLODLevel(20, knot2);

            knot0.removeLODLevel(knot1).removeLODLevel(knot2);

            // After remove lod levels, the LOD should be the original mesh with any radius
            [5, 15, 25].forEach((radius) => {
                cameraArc.radius = radius;
                scene.render();
                expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot0");
            });

            // And no one lod level should be left
            expect(knot0.getLODLevels().length).toEqual(0);
        });

        it("should remove lod level with null mesh", () => {
            knot0.addLODLevel(10, knot1);
            knot0.addLODLevel(20, knot2);
            knot0.addLODLevel(30, null);

            knot0.removeLODLevel(knot1);
            knot0.removeLODLevel(knot2);
            knot0.removeLODLevel(null);

            // And no one lod level should be left
            expect(knot0.getLODLevels().length).toEqual(0);

            // And the getLOD should return the original mesh with radius relative to null by previous LOD level
            cameraArc.radius = 35;
            scene.render();
            expect(knot0.getLOD(cameraArc)!.name).toEqual("Knot0");
        });
    });

    describe("getLODLevelAtDistance", () => {
        it("should return the lod level at distance", () => {
            knot0.addLODLevel(10, knot1);
            knot0.addLODLevel(20, knot2);
            knot0.addLODLevel(30, null);

            expect(knot0.getLODLevelAtDistance(9)).toBeNull();
            expect(knot0.getLODLevelAtDistance(10)).toEqual(knot1);
            expect(knot0.getLODLevelAtDistance(19)).toBeNull();
            expect(knot0.getLODLevelAtDistance(20)).toEqual(knot2);
            expect(knot0.getLODLevelAtDistance(29)).toBeNull();
            expect(knot0.getLODLevelAtDistance(30)).toBeNull();
        });
    });

    describe("addLODLevel", () => {
        it("should not possible add one mesh twice", () => {
            knot0.addLODLevel(10, knot1);
            knot0.addLODLevel(20, knot1);
            knot0.addLODLevel(30, knot1);

            expect(knot0.getLODLevels().length).toEqual(1);
        });
    });

    describe("LOD switching hysteresis", () => {
        let knotFine: Mesh;
        let knotCoarse: Mesh;

        beforeEach(() => {
            // The detailed level is the mesh itself, the coarse one is registered at 15 and the culling level at 30.
            knotFine = knot0;
            knotCoarse = knot1;
            knotFine.addLODLevel(15, knotCoarse);
            knotFine.addLODLevel(30, null);
        });

        const walk = (camera: FreeCamera, distances: number[]): (string | null)[] => {
            return distances.map((distance) => {
                camera.position.set(0, 0, -distance);
                scene.render();
                return knotFine.getLOD(camera)?.name ?? null;
            });
        };

        it("should keep the previous level when the camera only wobbles around a threshold", () => {
            const camera = new FreeCamera("Camera", Vector3.Zero(), scene);
            knotFine.computeWorldMatrix(true);
            scene.render();

            // First crossing to the coarse level is immediate, then 15.9 / 16 / 15.9 never switch back.
            expect(walk(camera, [16])).toEqual(["Knot1"]);
            expect(walk(camera, [15.9, 16, 15.9, 16])).toEqual(["Knot1", "Knot1", "Knot1", "Knot1"]);

            // Going back in far enough (below 15 * 0.9 = 13.5) restores the fine level immediately.
            expect(walk(camera, [13.5, 13.4])).toEqual(["Knot1", "Knot0"]);
            expect(walk(camera, [14])).toEqual(["Knot0"]);
        });

        it("should keep the previous level after moving back across a threshold", () => {
            const camera = new FreeCamera("Camera", Vector3.Zero(), scene);
            knotFine.computeWorldMatrix(true);
            scene.render();

            const expected = ["Knot0", "Knot0", "Knot1", "Knot1", "Knot1", "Knot0", "Knot1", null, null, "Knot1"];
            const selected = walk(camera, [10, 14, 16, 14, 16, 10, 29, 31, 29, 20]);

            expect(selected).toEqual(expected);
        });

        it("should keep the hysteresis on the culling level", () => {
            const camera = new FreeCamera("Camera", Vector3.Zero(), scene);
            knotFine.computeWorldMatrix(true);
            scene.render();

            // 31 switches to the null level, 29 keeps it, 20 goes back to the coarse (hysteresis) level.
            expect(walk(camera, [20, 31, 29])).toEqual(["Knot1", null, null]);
            expect(walk(camera, [20])).toEqual(["Knot1"]);
        });

        it("should use the world distance including parent scaling", () => {
            const camera = new FreeCamera("Camera", Vector3.Zero(), scene);

            const parent = MeshBuilder.CreateBox("parent", { size: 1 }, scene);
            parent.scaling.x = 2;
            knotFine.parent = parent;
            knotFine.position.x = 10;
            knotFine.computeWorldMatrix(true);
            scene.render();

            // The mesh center is 20 units away from the camera: the coarse level is already in use.
            expect(knotFine.getLOD(camera)!.name).toEqual("Knot1");
            expect(knotFine.getLOD(camera)!).toBe(knotCoarse);
        });

        it("should not modify the LOD meshes geometry when switching", () => {
            const camera = new FreeCamera("Camera", Vector3.Zero(), scene);
            knotFine.computeWorldMatrix(true);

            const finePositions = new Float32Array(knotFine.getVerticesData("position")!);
            const coarsePositions = new Float32Array(knotCoarse.getVerticesData("position")!);

            walk(camera, [10, 31, 10, 31]);

            expect(new Float32Array(knotFine.getVerticesData("position")!)).toEqual(finePositions);
            expect(new Float32Array(knotCoarse.getVerticesData("position")!)).toEqual(coarsePositions);
        });

        it("should apply the hysteresis to screen coverage too", () => {
            knotFine.useLODScreenCoverage = true;
            knotFine.removeLODLevel(knotCoarse);
            knotFine.removeLODLevel(null);
            knotFine.addLODLevel(0.5, knotCoarse);

            const camera = new ArcRotateCamera("Camera", 0, 0, 10, new Vector3(0, 0, 0), scene);
            knotFine.computeWorldMatrix(true);
            scene.render();

            const coverageCamera = (radius: number): string | null => {
                camera.radius = radius;
                scene.render();
                return knotFine.getLOD(camera)?.name ?? null;
            };

            // Moving further away reduces the coverage and crosses the 0.5 threshold: the coarse level is entered
            // immediately. Moving back to a coverage just above the threshold (0.5 to 0.55) keeps it, while a
            // larger move back clears the 10% band and restores the fine level.
            expect(coverageCamera(20)).toEqual("Knot0");
            expect(coverageCamera(80)).toEqual("Knot1");
            expect(coverageCamera(72)).toEqual("Knot1");
            expect(coverageCamera(69)).toEqual("Knot0");
        });

        it("should expose the current level index and allow the hysteresis to be disabled", () => {
            const camera = new FreeCamera("Camera", Vector3.Zero(), scene);
            knotFine.computeWorldMatrix(true);
            scene.render();

            // Levels are [30 (null), 15 (coarse)]: the mesh itself (fine) is index 2.
            expect(knotFine.getCurrentLODLevelIndex(camera)).toEqual(2);

            walk(camera, [16]);
            expect(knotFine.getCurrentLODLevelIndex(camera)).toEqual(1);

            knotFine.lodHysteresis = 0;
            expect(walk(camera, [14])).toEqual(["Knot0"]);
            expect(knotFine.getCurrentLODLevelIndex(camera)).toEqual(2);
        });
    });
});
