import bpy, math, os
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.world.color=(.09,.09,.09)
scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.16,.16,.16,1);scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.35
scene.view_settings.view_transform='AgX'
def mat(name,color,metal=0,rough=.3,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
 if emission:n.inputs['Emission Color'].default_value=(*color,1);n.inputs['Emission Strength'].default_value=emission
 return m
chrome=mat('Brushed platinum',(.6,.62,.65),1,.22)
black=mat('Obsidian ceramic',(.026,.028,.035),.7,.2)
white=mat('Porcelain',(.72,.73,.75),.4,.27)
glow=mat('White light',(.85,.9,1),.1,.24,2.3)
def finish(o,m):
 o.data.materials.append(m)
 if o.type=='MESH':
  for f in o.data.polygons:f.use_smooth=True
 return o
def torus(name,r,t,rot=(0,0,0),loc=(0,0,0),m=chrome):
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=t,major_segments=128,minor_segments=12,rotation=rot,location=loc);o=bpy.context.object;o.name=name;return finish(o,m)
def sphere(name,r,loc=(0,0,0),scale=(1,1,1),m=black):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,radius=r,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;return finish(o,m)
def cylinder(name,r,depth,loc=(0,0,0),rot=(0,0,0),m=chrome,verts=48):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=depth,location=loc,rotation=rot);o=bpy.context.object;o.name=name
 bevel=o.modifiers.new('Precision edges','BEVEL');bevel.width=.018;bevel.segments=2
 o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return finish(o,m)
def rod(name,a,b,r=.04,m=chrome):
 a,b=Vector(a),Vector(b);o=cylinder(name,r,(a-b).length,(a+b)/2,m=m);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
# A kinetic sculpture: luminous eye in nested gimbal rings.
root=bpy.data.objects.new('ORBIT — conceptual kinetic sculpture',None);scene.collection.objects.link(root)
torus('Outer gimbal',2.1,.055,(math.radians(72),math.radians(24),math.radians(-18)))
torus('Inner gimbal',1.79,.1,(math.radians(90),math.radians(-34),math.radians(30)),m=black)
torus('Inner gimbal silver edge',1.79,.022,(math.radians(90),math.radians(-34),math.radians(30)),m=chrome)
torus('Equatorial band',1.43,.072,(math.radians(17),math.radians(55),0))
torus('Equatorial light track',1.43,.014,(math.radians(17),math.radians(55),0),m=glow)
sphere('Core',1.01,scale=(1,.8,1),m=black)
# Front looks along negative Y.
torus('Iris housing',.72,.083,(math.pi/2,0,0),(0,-.7,0),chrome)
torus('Iris light rim',.635,.016,(math.pi/2,0,0),(0,-.792,0),glow)
cylinder('Pupil recess',.60,.1,(0,-.77,0),(math.pi/2,0,0),black)
# Repeated machined radial iris blades around a dark pupil.
for i in range(16):
 a=i*2*math.pi/16
 vertices=[]
 for rr,aa in [(0.19,a+.2),(.56,a),(.60,a+.21),(.28,a+.57)]:vertices.append((rr*math.cos(aa),-.847,rr*math.sin(aa)))
 mesh=bpy.data.meshes.new('blade');mesh.from_pydata(vertices,[],[(0,1,2,3)]);mesh.update();o=bpy.data.objects.new('Iris blade %02d'%i,mesh);scene.collection.objects.link(o);o.data.materials.append(chrome if i%2 else white)
 sol=o.modifiers.new('Blade thickness','SOLIDIFY');sol.thickness=.015
 bev=o.modifiers.new('Blade bevel','BEVEL');bev.width=.013;bev.segments=3
for i in range(12):
 a=i*math.tau/12
 cylinder('Housing bolt %02d'%i,.034,.035,(.731*math.cos(a),-.80,.731*math.sin(a)),(math.pi/2,0,0),black,6)
for i in range(4):
 a=i*math.tau/4
 rod('Gimbal arm',(.99*math.cos(a),.02,.99*math.sin(a)),(1.57*math.cos(a),.02,1.57*math.sin(a)),.055)
 sphere('Joint',.105,(1.57*math.cos(a),.02,1.57*math.sin(a)),m=chrome)
for i in range(48):
 a=i*math.tau/48
 sphere('Orbit marker',.032,(2.10*math.cos(a),2.10*math.sin(a),0),m=white)
for o in list(scene.objects):
 if o.type=='MESH':o.parent=root
root.rotation_euler=(.09,0,.14)
# Floor and lighting retained in the .blend, excluded from GLB.
floor=mat('Backdrop',(.008,.009,.012),.35,.3)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-2.45));plane=bpy.context.object;plane.name='Studio backdrop';finish(plane,floor)
def area(name,loc,power,size,target=(0,0,0)):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Long white key',(-3,-4,6),1100,5)
area('Right rim',(4,1,3),1500,4)
area('Rear strip',(-3,3,0),1300,3)
area('Front softbox',(0,-6,1),200,2)
bpy.ops.object.camera_add(location=(5,-9,4));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=6.6;scene.camera=camera
bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
for o in root.children:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public/models/orbit-study.glb'),export_format='GLB',use_selection=True,export_apply=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art/blender/orbit-study.blend'))
scene.render.filepath=os.path.join(ROOT,'art/renders/orbit-study.png');bpy.ops.render.render(write_still=True)
# A close detail render that reveals the iris structure.
camera.location=(2,-7,1.8);camera.rotation_euler=(Vector((0,-.3,0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=3.6
scene.render.resolution_x=1400;scene.render.resolution_y=1100;scene.render.filepath=os.path.join(ROOT,'art/renders/iris-detail.png');bpy.ops.render.render(write_still=True)
print('STUDIES COMPLETE')
